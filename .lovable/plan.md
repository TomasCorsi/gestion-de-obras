# Plan: Habilitar consultas complejas en el Chat IA de Reportes

## Problema

La función `chat-reportes` actualmente hace **una sola** consulta SQL por pregunta:
1. La IA decide un query → 2. Se ejecuta → 3. La IA responde.

Cuando hacés una pregunta como *"Necesito saber todo el movimiento de POLO INDUSTRIAL EZEIZA 2: empleados, combustible, remitos, órdenes de compra, gastos generales, etc."*, la IA necesita ejecutar **6+ queries encadenados** (primero buscar la obra, después con ese ID consultar cada tabla). Hoy ejecuta solo el primero y se queda muda.

Confirmado en los logs: solo apareció `SELECT id, nombre, estado FROM obras WHERE nombre ILIKE '%POLO INDUSTRIAL EZEIZA 2%'` y nada más.

## Solución

Convertir la lógica de la edge function en un **loop agéntico**: permitir hasta N rondas de tool calls hasta que la IA decida que tiene toda la información para responder.

## Cambios

### `supabase/functions/chat-reportes/index.ts`

1. **Refactor del flujo**: reemplazar el patrón `firstCall → toolResults → secondCall(stream)` por un loop:
   ```
   loop (hasta MAX_ITERATIONS = 8):
     - llamar al modelo con todo el historial acumulado
     - si devuelve tool_calls → ejecutar todos los SELECT, agregar resultados al historial, continuar
     - si NO devuelve tool_calls → hacer la llamada final con stream=true y devolver el body
   ```

2. **Ajustes adicionales**:
   - Mejorar el system prompt para indicar que puede ejecutar varios queries secuenciales cuando el usuario pida información combinada de varias tablas.
   - Sugerir que para preguntas tipo "todo el movimiento de la obra X" arranque obteniendo el `obra_id` y después haga queries paralelos.
   - Loggear cada SQL ejecutado y el número de iteración para debugging.
   - Cortar de forma segura si se alcanza el máximo de iteraciones devolviendo un mensaje útil ("La consulta es muy compleja, dividila en partes").
   - Manejar errores de SQL devolviendo el error al modelo dentro del historial para que pueda corregir el query y reintentar.

3. **Sin cambios en el frontend** (`ChatReportesTab.tsx`): sigue funcionando igual porque el contrato (JSON no-stream o SSE) se mantiene.

## Detalles técnicos

- `MAX_ITERATIONS = 8` (margen suficiente para 6-7 queries + respuesta final).
- Conservar `google/gemini-3-flash-preview` (rápido y suficiente).
- Mantener la verificación de rol admin y `execute_readonly_query`.
- La última iteración (sin tool_calls) usa `stream: true` y se retorna el body como SSE, igual que hoy.

## Verificación

Después del deploy, repetir la pregunta original y revisar los logs de la edge function: deberían aparecer 5-7 queries SQL secuenciales y una respuesta final en el chat.

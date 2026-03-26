

## Plan: Chat de reportes con IA (lenguaje natural)

### Concepto
Agregar una pestaña "Consultar con IA" en la página de Reportes, con un chat donde el usuario escribe preguntas en español (ej: "¿Cuánto gastamos en combustible en marzo?", "¿Qué obra tiene más rentabilidad?") y la IA responde consultando la base de datos.

### Arquitectura

```text
Usuario escribe pregunta
        ↓
  Frontend envía mensaje
        ↓
  Edge Function "chat-reportes"
        ↓
  1. Recibe pregunta + historial
  2. Envía a Lovable AI con system prompt que incluye
     el schema de las tablas relevantes
  3. La IA genera una query SQL SELECT
  4. La edge function ejecuta la query contra la DB
  5. Envía los resultados de vuelta a la IA
  6. La IA formula una respuesta legible en español
  7. Devuelve respuesta al frontend (streaming)
```

### Cambios

**1. Nueva edge function: `supabase/functions/chat-reportes/index.ts`**
- Recibe `{ messages: [{role, content}] }`
- System prompt con schema de tablas relevantes: `obras`, `cotizaciones`, `cargas_combustible`, `mantenimientos`, `remitos`, `partes_diarios`, `personal`, `maquinarias`, `horas_maquina`, `otros_gastos`, `viajes`
- Usa tool calling: la IA llama una función `ejecutar_consulta_sql` con la query SELECT
- La edge function ejecuta la query con `SUPABASE_DB_URL` (solo SELECT, con LIMIT 100)
- Envía los resultados como mensaje de vuelta y pide a la IA que los interprete
- Streaming de la respuesta final
- Seguridad: solo permite SELECT, rechaza cualquier INSERT/UPDATE/DELETE/DROP/ALTER

**2. Nuevo componente: `src/components/reportes/ChatReportesTab.tsx`**
- Chat UI con historial de mensajes
- Input para escribir preguntas
- Renderiza respuestas con markdown (`react-markdown`)
- Ejemplos de preguntas sugeridas como chips clickeables
- Indicador de "pensando..." mientras la IA procesa

**3. Editar: `src/pages/Reportes.tsx`**
- Agregar Tabs: "Financiero" (contenido actual) + "Consultar con IA"
- La pestaña de IA muestra el ChatReportesTab

### Ejemplos de preguntas soportadas
- "¿Cuánto gastamos en combustible en marzo 2026?"
- "¿Qué obra tiene más rentabilidad?"
- "¿Cuántos remitos hay de desmonte este mes?"
- "¿Qué máquinas tienen mantenimiento pendiente?"
- "Lista las 5 obras con más horas máquina"
- "¿Cuántos partes diarios se cargaron la semana pasada?"

### Seguridad
- La query generada se valida: solo se ejecutan SELECT, con LIMIT forzado
- Se usa `SUPABASE_DB_URL` (ya disponible como secret) para la conexión directa a la DB desde la edge function
- No se expone ningún dato sensible (passwords, tokens) — el schema del system prompt solo lista columnas de negocio

### Archivos a crear/editar
- `supabase/functions/chat-reportes/index.ts` — nueva edge function
- `src/components/reportes/ChatReportesTab.tsx` — nuevo componente de chat
- `src/pages/Reportes.tsx` — agregar tabs con la pestaña de IA


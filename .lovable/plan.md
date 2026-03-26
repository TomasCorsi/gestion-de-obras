

## Plan: Agregar campo de instrucciones en el importador de cómputos con IA

### Objetivo
Agregar un textarea opcional donde el usuario pueda escribir instrucciones sobre cómo la IA debe interpretar el documento adjuntado (ej: "los precios están en dólares", "la columna C es la cantidad", "ignorar las filas de subtotales").

### Cambios

**1. `src/components/cotizaciones/ImportComputoDialog.tsx`**
- Agregar state `instrucciones` (string)
- Debajo de las tabs y antes del botón "Procesar con IA", mostrar un textarea colapsable con label "Instrucciones para la IA (opcional)"
- Enviar `instrucciones` al edge function junto con `content` y `type`
- Resetear `instrucciones` en la función `reset()`

**2. `supabase/functions/parse-computo/index.ts`**
- Recibir campo `instrucciones` del body
- Si hay instrucciones, agregarlas al mensaje del usuario como contexto adicional antes del contenido, por ejemplo: `"Instrucciones del usuario: {instrucciones}\n\nExtraé los rubros e ítems..."`

### UX
- El campo de instrucciones aparece siempre visible debajo de las tabs, con un placeholder orientativo
- Placeholder: "Ej: Los precios están en dólares, la columna D es la cantidad, ignorar subtotales..."
- No es obligatorio, si está vacío no se envía nada extra


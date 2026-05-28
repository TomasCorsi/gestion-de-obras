## Diagnóstico

Los gastos siguen guardados: hay 3 registros de 2026 en `otros_gastos`. La pantalla queda vacía porque la consulta del frontend intenta traer relaciones embebidas con `obras` y `maquinarias`, pero en la base no están declaradas las relaciones necesarias para `otros_gastos`.

También detecté que `otros_gastos` fue creada sin permisos explícitos para la API de la app, así que conviene corregir eso en la misma intervención para evitar que se vuelva a ver vacío por permisos.

## Plan de arreglo

1. **Migración de base de datos**
   - Agregar la foreign key faltante:
     - `otros_gastos.maquinaria_id` → `maquinarias.id`
   - Confirmar/reponer la relación:
     - `otros_gastos.obra_id` → `obras.id`
   - Agregar permisos explícitos para que usuarios autenticados puedan acceder a `otros_gastos` desde la app.
   - Mantener RLS existente: admin/capataz gestionan, maquinista/ayudante ven según las políticas actuales.

2. **Ajuste defensivo en el hook**
   - Mantener la consulta con relaciones cuando la base ya las resuelva correctamente.
   - Agregar un fallback: si por alguna razón falla el embed, traer los gastos igual sin relaciones para que nunca desaparezcan de la grilla.

3. **Verificación**
   - Confirmar que la base devuelve los 3 gastos.
   - Confirmar que la consulta con `obra` y `maquinaria` ya no falla.
   - La pestaña debe volver a mostrar: Fucionista, ELECTRICISTA y Extensión de Gas Natural.
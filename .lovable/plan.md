# Sector de obra en remitos

## Qué se agrega
- Nuevo campo **«Sector de obra»** en los formularios de remitos de **Viajes** y **Materiales** (no en Máquinas).
- Funciona igual que «Tipo de material»: desplegable con buscador y opción **«Agregar sector»** para crear uno nuevo en el momento, que queda disponible para todos.
- **Cada obra tiene sus propios sectores**: el desplegable muestra solo los sectores de la obra elegida en el remito. Si no hay obra elegida, el campo queda deshabilitado con el aviso «Elegí la obra primero». Al cambiar la obra, se limpia el sector.
- Es opcional; los remitos existentes quedan sin sector.

## Dónde se ve
- Columna «Sector» en las grillas de Viajes y Materiales, con su filtro (igual que Tipo Material) y búsqueda.
- Columna «Sector» en las hojas Viajes y Materiales del Excel exportado.
- En la liquidación por obra se muestra el sector en el detalle.

## Detalles técnicos
- Tabla nueva `remito_sectores_obra` (obra_id, nombre, created_by), único por (obra_id, nombre normalizado); GRANTs + RLS: leer para quienes pueden ver remitos (`can_view_remitos`), insertar autenticados con acceso a remitos.
- Columna `sector_obra text null` en `remitos` y `remitos_materiales` (texto, igual que tipo_material). En Viajes la obra se resuelve por el destino («Hasta») → obra_id; en Materiales por su obra.
- Hook `useSectoresObra(obraId)` análogo a `useTiposMaterial`, reutilizando el `Combobox` con `allowCustom`.
- Sanitizar vacío → null al guardar. Prueba unitaria del filtrado por obra y deduplicación.

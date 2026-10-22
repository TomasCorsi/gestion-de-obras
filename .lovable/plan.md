# Chofer para remitero, patente de camiones y buscadores en remitos

## Qué se arregla
1. **Chofer vacío para remitero**: el remitero no tiene permiso para ver la lista completa de personal, por eso la lista de choferes le aparece vacía. Se cambia para que use la lista segura de personal (solo nombre, apellido y rol, sin datos sensibles), que todos los usuarios pueden ver.
2. **Camiones con patente**: en la lista de camiones se muestra "Interno – Nombre – Patente" (ej: "705 – Mercedes 1720 – AB123CD"), y la búsqueda también encuentra por patente.
3. **Buscador en cada lista desplegable**: en los formularios de Remitos de viajes, materiales y máquinas, las listas (camión, chofer, proveedor, obra origen/destino, cliente, máquina) pasan a tener un buscador arriba para escribir y filtrar.

## Detalles técnicos
- `MaterialesRemitosPanel.tsx`: choferes desde la vista `personal_selector` (rol = chofer) en vez de `usePersonal`; nombre del chofer en la grilla/Excel también desde esa vista.
- Etiqueta de camiones: `codigo – nombre – patente`.
- Reemplazar el `Pick` (Select simple) por un combobox con buscador (Popover + Command, igual al de materiales) y reutilizarlo en los paneles de materiales, máquinas y el formulario de viajes donde haya selects largos.
- Verificar con una sesión de remitero que la lista de choferes cargue.

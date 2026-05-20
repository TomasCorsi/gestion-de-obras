# Selector de Proveedores en Gastos Generales

## Objetivo
Al crear/editar un Gasto General (pestaña Gastos Generales en Proveedores), el campo **Proveedor** debe mostrar la lista de proveedores ya cargados en el sistema, en lugar de ser un input de texto libre.

## Comportamiento propuesto
- Reemplazar el `<Input>` de Proveedor por un **Combobox con búsqueda** (mismo patrón que se usa en otras partes de la app, ej. `GridSelectCell` / Comando shadcn).
- Lista las opciones desde `useProveedores()` filtradas por `activo = true`, ordenadas alfabéticamente.
- Opción **"Sin proveedor"** al inicio (deja el campo en `null`).
- Se guarda el **nombre** del proveedor en `otros_gastos.proveedor` (la columna es texto), para no romper datos históricos ni cambiar el esquema.
- Permite escribir para filtrar; si no hay coincidencias, mostrar texto "No se encontraron proveedores".
- En edición, precargar el proveedor actual si coincide con uno de la lista (por nombre). Si el gasto tiene un nombre antiguo que no existe en la tabla, igualmente mostrarlo seleccionado como valor libre.

## Archivos a tocar
- `src/components/proveedores/GastosGeneralesTab.tsx`:
  - Importar `useProveedores`.
  - Reemplazar el bloque del input `proveedor_gg` por un Combobox (Popover + Command de shadcn).
  - Mantener el resto del formulario igual.

## Fuera de alcance
- No se modifica la base de datos.
- No se cambia el flujo de Órdenes de Compra ni otros módulos.
- No se agregan permisos ni RLS.

## Verificación
- Abrir Proveedores → Gastos Generales → "Nuevo Gasto": el desplegable lista los proveedores activos.
- Buscar por texto filtra la lista.
- Seleccionar uno y registrar guarda el nombre en `proveedor`.
- Editar un gasto existente muestra el proveedor previamente cargado.

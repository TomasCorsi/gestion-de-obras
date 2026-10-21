# Remitos de materiales con varios renglones y catálogo de materiales

## Qué cambia para el usuario
1. **Un remito, varios materiales**: en "Nuevo remito de materiales", los datos comunes se cargan una sola vez (fecha, N° remito, movimiento, proveedor u obra origen, obra destino, observaciones). Debajo aparece una lista de renglones: Material, Cantidad, Unidad, Precio unitario e Importe, con un botón "Agregar material" y otro para quitar cada renglón. El total del remito se calcula solo.
2. **Catálogo de materiales**: el material ya no se escribe a mano. Se elige de un desplegable con buscador (por ejemplo "Hierro Ø 8 mm"). Cada material tiene su unidad por defecto, que se completa sola al elegirlo.
3. **Nombres siempre iguales**:
   - Si alguien escribe "hierro 8", "Hierro del 8" o "HIERRO 8MM", el buscador encuentra "Hierro Ø 8 mm".
   - Para crear un material nuevo, el sistema muestra los parecidos que ya existen ("¿Quisiste decir Hierro Ø 8 mm?") y no deja guardar un duplicado.
   - Los nombres nuevos se guardan con un formato prolijo: primera letra en mayúscula, sin espacios dobles y con las medidas escritas igual.
4. **Administración del catálogo** (solo administradores): una pestaña "Catálogo" dentro de Materiales para renombrar, cambiar la unidad, desactivar o **unificar** dos materiales repetidos. Al unificar, los remitos anteriores pasan al nombre correcto.
5. **Listado y Excel**: cada material va en su propio renglón, repitiendo fecha, N° de remito, proveedor u obra. Así se puede filtrar y sumar por material (por ejemplo, todos los kilos de Hierro Ø 8 mm que fueron a una obra). Editar cualquier renglón abre el remito completo.

## Datos existentes
Los remitos de materiales que ya están cargados pasan a ser remitos de un solo renglón. Su texto se vincula al material del catálogo que coincida, y si no hay coincidencia se crea uno nuevo. Antes de unificar, te muestro la lista de materiales que encontré para que la revises.

## Detalles técnicos
- Tabla nueva `materiales_catalogo` (id, nombre, nombre_normalizado único, unidad_default, categoria, activo, created_by), con RLS: todos los usuarios autenticados pueden leer e insertar, y solo los administradores pueden modificar o borrar. Incluye los GRANT correspondientes.
- Tabla nueva `remito_material_items` (remito_id → remitos_materiales, material_id → catálogo, cantidad numeric, unidad, precio_unitario, orden), con RLS igual a la de `remitos_materiales`.
- Una función `normalizar_material(text)` que pasa a minúsculas, quita tildes, quita "del", "de" y "Ø", y convierte "mm" y los números a un mismo formato. Se usa para el índice único y para la búsqueda en el cliente (con la misma lógica en `src/lib/materiales.ts`). El buscador se apoya en `stringSimilarity.ts` para sugerir parecidos.
- Las columnas viejas `material`, `cantidad` y `precio_unitario` de `remitos_materiales` quedan marcadas como retiradas, sin borrarse. Se completan los renglones a partir de ellas.
- `RemitosTipoPanel` (materiales) pasa a usar un editor de renglones y un listado aplanado como el de viajes. La exportación a Excel queda con un renglón por material.
- Pruebas en `src/lib/materiales.test.ts`: "hierro del 8", "Hierro 8" y "HIERRO Ø8 mm" dan la misma clave, y el total del remito es la suma de cantidad × precio.

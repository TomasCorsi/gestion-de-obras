

## Grilla Editable en el Formulario de Certificado

### Objetivo
Reemplazar la tabla actual del formulario "Nuevo/Editar Certificado" (seccion Servicio y seccion Servicio dentro de Mixto) por una grilla editable tipo Excel usando `react-datasheet-grid`. Esto permite agregar filas libres sin necesidad de tener conceptos predefinidos, escribir directamente, y copiar/pegar desde planillas externas.

### Que cambia para el usuario
- En vez de tener que crear conceptos previamente y luego "Agregar concepto" uno por uno, el usuario puede escribir directamente en la grilla
- Puede agregar filas nuevas con el boton "+" de la grilla o pegando desde Excel
- Los campos editables son: Descripcion, Categoria, Sub Categoria, Unidad, Cantidad, Precio Unitario
- El Subtotal se calcula automaticamente
- Los conceptos existentes se siguen cargando como filas pre-llenadas, pero ahora son editables
- Se puede eliminar filas con el menu de la grilla

### Seccion Obra (sin cambios)
La seccion Obra mantiene su formato actual con las columnas de acumulados, porcentajes, etc. porque requiere logica especial que no se adapta bien a una grilla simple.

### Resumen tecnico

**Archivo principal:** `src/pages/Certificados.tsx`

| Cambio | Detalle |
|---|---|
| Importar react-datasheet-grid | Agregar imports de `DataSheetGrid`, `textColumn`, `floatColumn`, `keyColumn` y estilos CSS |
| Nuevo tipo de fila para la grilla | Definir interfaz `GridRow` con campos: descripcion, categoria, etapa, unidad, cantidad, precio_unitario |
| Columna personalizada para selects | Crear columnas de tipo select para Categoria (dropdown con CATEGORIAS_CERTIFICADO) y Unidad (dropdown con HR, DIA, M3, etc.) usando `GridSelectCell` existente o componentes inline |
| Reemplazar tabla Servicio por grilla | En la seccion `tipoCert === "servicio"`, reemplazar el bloque de `draftGroupedCategoria.map(...)` por un `DataSheetGrid` con las columnas mencionadas |
| Reemplazar tabla Servicio en Mixto | En la seccion Mixto > "Seccion Servicio", reemplazar la tabla por la misma grilla |
| Sincronizar grilla con itemsDraft | Convertir `itemsDraft` (filtrado por seccion servicio) a `GridRow[]` para la grilla, y al cambiar la grilla, actualizar `itemsDraft` manteniendo los items de obra intactos |
| Subtotal calculado | Agregar columna de solo lectura que muestra cantidad * precio_unitario |
| Eliminar boton "Agregar concepto" en servicio | Ya no es necesario porque la grilla permite agregar filas directamente |
| Mantener funcionalidad de duplicar | Al duplicar un certificado, las filas se cargan en la grilla normalmente |
| buildDraftForTipo | Sin cambios - sigue generando items desde conceptos activos, que se muestran como filas editables en la grilla |

**Archivo CSS:** `src/index.css` o import directo
- Importar estilos de `react-datasheet-grid/dist/style.css`

**Archivos sin cambios:**
- `src/hooks/useCertificados.ts` - Ya soporta items con `concepto_id: null`
- `src/utils/generateCertificadoPDF.ts` - Ya maneja items sin concepto_id
- La seccion Obra del formulario se mantiene igual


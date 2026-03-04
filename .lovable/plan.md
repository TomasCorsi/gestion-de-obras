

# Edición inline de conceptos en la tabla

## Cambio

Reemplazar el componente `ConceptoRow` (líneas 1935-2085 de `src/pages/Certificados.tsx`) para que las celdas de la tabla sean editables directamente, sin necesidad de abrir un diálogo con el lápiz.

### Comportamiento nuevo

- **Nombre**: `Input` inline editable, se guarda al perder foco (onBlur)
- **Unidad**: `Select` inline (ya visible, sin click extra)
- **Precio Unitario**: `Input type="number"` inline, se guarda al perder foco
- **Cant. Total**: `Input type="number"` inline, se guarda al perder foco
- **Sub Categoría**: `Input` inline, se guarda al perder foco
- **Estado (Activo/Inactivo)**: Ya es clickeable (Badge toggle), se mantiene igual
- **Acciones**: Se elimina el botón de lápiz (ya no hace falta), se mantiene el botón de eliminar

Cada campo llama a `onUpdate({ campo: nuevoValor })` en el `onBlur` del input, solo si el valor cambió respecto al original. Esto evita llamadas innecesarias a la API.

Se elimina el diálogo de edición (`editDialogOpen`, `editForm`, `handleSaveEdit`) ya que no será necesario.

### Archivo a modificar
1. `src/pages/Certificados.tsx` — reescribir `ConceptoRow` con inputs inline


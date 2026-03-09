

# Hacer el formulario de Nuevo Remito responsive y scrollable

## Problema
El dialog usa `max-w-2xl` y un grid fijo de 3 columnas sin scroll. En pantallas chicas (mobile/tablet) el contenido se corta y no se puede acceder a todos los campos.

## Solución

### Editar `src/components/remitos/RemitoQuickFormDialog.tsx`

1. **DialogContent**: Agregar `max-h-[90vh] overflow-y-auto` para que sea scrollable cuando el contenido excede la pantalla
2. **Grid responsive**: Cambiar `grid-cols-3` a `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` para que en mobile sea 1 columna, en tablet 2, y en desktop 3
3. **Observaciones**: Ajustar `col-span` responsive (`col-span-1 sm:col-span-2 md:col-span-3`)
4. **Padding/gap**: Reducir gap en mobile con `gap-2 md:gap-3`
5. **DialogFooter**: Agregar `sticky bottom-0 bg-card pt-2` para que los botones siempre estén visibles al hacer scroll

### Archivo
- **Editar**: `src/components/remitos/RemitoQuickFormDialog.tsx`


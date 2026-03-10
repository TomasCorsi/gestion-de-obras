

# Fix: cantidad_uni vacio + formulario desordenado

## Problema 1: cantidad_uni vacia

El formulario tiene un campo "Cantidad" que mapea a `form.cantidad`, pero nunca setea `form.cantidad_uni`. En el grid, la columna "Cant. Uni." lee `cantidad_uni`, que queda en `null` porque el formulario no lo envia.

La grilla usa la logica: `cantidad = cantidad_uni × viajes`. El formulario deberia seguir la misma logica.

**Solucion**: Reemplazar el campo "Cantidad" por "Cant. Unitaria" (`cantidad_uni`), y auto-calcular `cantidad = cantidad_uni × cantidad_viajes`. Asi queda consistente con la grilla.

## Problema 2: formulario desordenado / textos pisados

El grid de 3 columnas con `gap-2` y labels `text-xs` causa solapamiento en pantallas chicas. Los Combobox y Select tienen alturas inconsistentes.

**Solucion**: 
- Aumentar gap a `gap-3 md:gap-4`
- Agregar `truncate` a los labels que se pisan
- Reorganizar campos en secciones logicas con separadores visuales (titulos de seccion)
- Asegurar alturas consistentes en todos los inputs/selects/combobox

## Archivos a modificar
- `src/components/remitos/RemitoQuickFormDialog.tsx`
  - Reemplazar campo "Cantidad" por "Cant. Unitaria" mapeado a `cantidad_uni`
  - Auto-calcular `cantidad = cantidad_uni × cantidad_viajes` en el `set()` handler
  - En `handleSubmit`, enviar `cantidad_uni` correctamente y calcular `cantidad`
  - Reorganizar layout con secciones, mejor spacing, y truncate en labels


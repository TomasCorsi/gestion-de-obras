

# Fix: Botón de agregar filas tapado en grilla de Remitos

## Problema
En modo pantalla completa, el botón "+" de `react-datasheet-grid` (que aparece abajo de la grilla para agregar filas) queda tapado porque el cálculo de altura del grid no tiene en cuenta todo el espacio ocupado por la toolbar, el texto de ayuda y el padding del contenedor.

## Causa
`gridHeight = window.innerHeight - 180` no descuenta correctamente:
- Padding del contenedor (`p-4` = 32px arriba+abajo)
- Toolbar de filtros + botones (~40px)
- Texto de ayuda (~24px)
- Header superior (~60px)

## Solución

### `src/components/remitos/RemitosDataGrid.tsx` (línea 838)
Aumentar el offset de 180 a ~230 para que la grilla no se desborde del viewport y el botón de agregar filas quede visible:

```typescript
const gridHeight = fullScreen ? window.innerHeight - 230 : 500;
```

Esto da espacio suficiente para que el botón "+" nativo de la grilla y la scrollbar horizontal no se superpongan ni queden fuera de vista.


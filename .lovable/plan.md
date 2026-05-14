# Scroll horizontal siempre visible en Remitos

## Problema

Hoy la tabla de remitos tiene su barra de scroll horizontal **abajo** del contenedor con altura fija. Para usarla, el usuario tiene que bajar hasta el final de la tabla (o al final de la página) para ver y arrastrar la barra. Resulta incómodo cuando la tabla es ancha y se quiere desplazar lateralmente sin perder de vista las primeras filas.

## Solución

Agregar una **segunda barra de scroll horizontal pegada arriba** del contenedor de la tabla, sincronizada con el scroll real. Así el usuario ve y usa la barra desde el primer momento, sin tener que bajar.

- La barra de arriba es una franja delgada (≈12px) sticky encima de la tabla.
- Mueve la tabla cuando se arrastra, y se mueve cuando se hace scroll horizontal en la tabla (sincronización bidireccional).
- Se oculta automáticamente si la tabla no necesita scroll horizontal (contenido cabe en pantalla).
- Se mantiene la altura fija actual (`calc(100vh - 360px)`, mínimo 400px) y el scroll vertical interno.
- El scrollbar nativo abajo se conserva (no molesta y sirve de respaldo).

## Archivos a tocar

- `src/components/remitos/RemitosSimpleGrid.tsx` — único archivo afectado.
  - Agregar un `ref` al contenedor scrollable existente.
  - Agregar un nuevo `div` sticky arriba con un hijo de ancho igual al `scrollWidth` de la tabla.
  - Sincronizar `scrollLeft` entre ambos con listeners `onScroll` y un `ResizeObserver` para recalcular el ancho cuando cambie la cantidad de filas o columnas.

## Detalles técnicos

```text
┌─ container ──────────────────────────────────────┐
│ [▭▭▭▭▭▭▭▭▭▭ scroll top sticky ▭▭▭] ← nuevo       │
│ ┌─ overflow-auto (altura fija, ya existe) ─────┐ │
│ │ Header sticky                                │ │
│ │ Filas...                                     │ │
│ │                                              │ │
│ │ [▭▭▭▭▭▭▭▭▭ scroll bottom nativo ▭▭▭]         │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- Usar `useRef` para `topScrollRef` y `bodyScrollRef`.
- En `onScroll` de cada uno, copiar `scrollLeft` al otro (con flag para evitar loop).
- `ResizeObserver` sobre la tabla interna para mantener el ancho del "fantasma" del scroll superior igual a `table.scrollWidth`.

## Verificación

1. Entrar a `/remitos` con el filtro vacío y la lista cargada.
2. Confirmar que la barra horizontal aparece arriba apenas se renderiza la tabla, sin scrollear.
3. Arrastrar la barra de arriba → la tabla se desplaza lateralmente.
4. Hacer scroll horizontal con la rueda/trackpad sobre la tabla → la barra de arriba se mueve en sincronía.
5. Reducir el ancho de columnas/quitar columnas mentalmente (o achicar la ventana hasta que entre todo) → la barra superior desaparece.
6. Verificar que no se rompe el reordenamiento por drag-and-drop ni el header sticky.

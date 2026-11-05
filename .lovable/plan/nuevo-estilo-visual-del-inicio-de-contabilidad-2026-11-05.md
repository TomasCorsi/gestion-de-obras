# Nuevo estilo visual del Inicio de Contabilidad

Solo cambia la apariencia. Se mantienen los mismos módulos, nombres, descripciones, accesos, búsqueda, recientes y permisos.

## Qué cambia
- Título centrado "Aplicaciones contables" con subtítulo "Seleccioná un sector para comenzar".
- Buscador centrado debajo del título; resultados y "Recientes" también centrados.
- Tarjetas verticales centradas, del mismo tamaño: ícono arriba dentro de un cuadrado redondeado con fondo pastel, nombre debajo en negrita y descripción corta en gris.
- Cada módulo con su propio color (violeta, azul, índigo, rojo/rosa, verde, celeste, naranja, sky, púrpura, ámbar, teal, gris), como en la imagen.
- Grilla centrada: 6 columnas en pantallas grandes, 4 en medianas, 2 en celular.
- Sin flecha lateral; al pasar el mouse la tarjeta se eleva levemente con borde del color del módulo.
- "Próximamente" se mantiene como etiqueta atenuada.

## Detalles técnicos
- Solo se edita `src/components/contabilidad/ContabLauncher.tsx` (y tokens de color pastel en `src/index.css` / `tailwind.config.ts` para respetar modo oscuro).
- Mapa de color por id de módulo, sin tocar `contabNav.ts`.
- Sin cambios de base, permisos, rutas ni lógica. Se corren las pruebas existentes.

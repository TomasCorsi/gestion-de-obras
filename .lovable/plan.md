
## Corregir la linea roja que tapa el texto en la caja de totales del PDF

### Problema
La linea roja separadora en la caja de totales se dibuja demasiado cerca del texto "TOTAL", tapandolo visualmente.

### Solucion
En el archivo `src/utils/generateCertificadoPDF.ts`, funcion `renderTotalsBox` (linea 344-349):

- Mover la linea roja separadora mas arriba, cambiando el offset de `lineY - 2` a `lineY - 4` para que quede claramente por encima del texto.
- Agregar un pequeno espacio extra despues de la linea, incrementando `lineY` en 2mm adicionales cuando hay separador, para que el texto "TOTAL" no quede pegado a la linea.

### Detalle tecnico

**Archivo:** `src/utils/generateCertificadoPDF.ts`, lineas 344-355

Cambiar la logica del separador:
- La linea roja se dibuja en `lineY - 4` en vez de `lineY - 2`
- Despues de dibujar la linea, se suma 2mm extra a `lineY` para dar espacio al texto

Esto separa visualmente la linea del texto "TOTAL" sin afectar el resto del layout.

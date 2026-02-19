
## Ampliar el área de scroll de conceptos en el diálogo de certificados

### Problema identificado

En el diálogo "Editar/Crear Certificado", la tabla de conceptos tiene `max-h-[50vh]` fijo. Pero el diálogo en sí está limitado a `max-h-[90vh]` y tiene varias secciones que consumen espacio vertical:
- Cabecera: Tipo, Período, Número, Anticipo, Observaciones (~180px)
- Totales fijos abajo: Avance Anterior, Actual, Acumulado, Anticipo, IVA, Total (~160px)
- Footer con botones (~60px)

Esto deja apenas ~200px para la tabla de conceptos con `50vh` en una pantalla de 1080px, lo que resulta en una sola fila visible cuando el diálogo ya está lleno de contenido.

### Solución

Cambiar el layout del diálogo a un modelo **flex column** donde la sección de conceptos se expande para llenar todo el espacio disponible entre los campos superiores y los totales inferiores. Esto se hace con `flex-1 min-h-0 overflow-y-auto` en lugar del `max-h-[50vh]` fijo.

El truco clave es: el `DialogContent` ya tiene `flex flex-col`, y los hijos del medio que deben crecer necesitan `flex-1 min-h-0` para respetar el contenedor padre. Esto hace que los conceptos tomen todo el espacio libre del 90vh disponible.

### Cambio técnico (único archivo)

**`src/pages/Certificados.tsx` — línea 836:**

```tsx
// ANTES:
<div className="overflow-y-auto max-h-[50vh] pr-2">

// DESPUÉS:
<div className="flex-1 min-h-0 overflow-y-auto pr-2">
```

Esto es todo lo necesario. Con `flex-1` el contenedor de conceptos toma todo el espacio vertical disponible dentro del flex column del diálogo. Con `min-h-0` se asegura que el overflow funcione correctamente dentro de un flex container (sin este, los items flex ignoran la restricción de altura del padre).

### Resultado esperado

- Con 20 conceptos como en el ejemplo: la tabla mostrará al menos 8-10 filas a la vez sin scroll
- Los totales y botones siempre quedan fijos abajo (ya estaban fuera del scroll, esto no cambia)
- La cabecera con Tipo/Período/Anticipo/Observaciones también queda fija arriba
- Solo la sección de conceptos hace scroll interno
- El diálogo ocupa el 90vh completo de forma aprovechada

### Archivos modificados

| Archivo | Línea | Cambio |
|---|---|---|
| `src/pages/Certificados.tsx` | 836 | `max-h-[50vh]` → `flex-1 min-h-0` |

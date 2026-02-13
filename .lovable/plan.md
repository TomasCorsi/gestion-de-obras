

## Fix: Solo se ven los alquileres de máquinas al crear certificado

### Problema identificado

Al abrir el diálogo de "Nuevo Certificado", todas las categorías de conceptos se cargan correctamente, pero el diálogo tiene un área de scroll limitada (`max-h-[90vh]`). La primera categoría "Alquiler de Máquinas" (que tiene muchos conceptos) ocupa todo el espacio visible, haciendo que las categorías restantes (Materiales, Servicios, etc.) queden ocultas debajo sin indicación visual clara de que hay más contenido.

### Solución propuesta

Mejorar la visibilidad del contenido en el diálogo de crear/editar certificado:

1. **Agregar indicador visual de scroll**: Asegurar que el `ScrollArea` tenga una altura máxima definida para que la barra de scroll sea visible.

2. **Reducir la altura de las filas de la tabla**: Hacer las filas más compactas para que entren más conceptos en el espacio visible.

3. **Agregar un resumen por categoría visible sin scroll**: Mostrar un indicador tipo "X categorías, Y conceptos" al inicio del formulario para que el usuario sepa que hay más contenido.

4. **Mejorar el ScrollArea**: Cambiar la configuración del `ScrollArea` para que tenga una altura máxima fija y la barra de scroll sea siempre visible, en lugar de depender del flex layout.

### Detalle técnico

**Archivo a modificar: `src/pages/Certificados.tsx`**

- En el `DialogContent` (línea 709): Cambiar el layout para que el `ScrollArea` tenga una altura máxima explícita en vez de usar `flex-1`, lo cual puede no funcionar correctamente con `ScrollArea` de Radix.
- Reemplazar `ScrollArea className="flex-1 pr-4"` por `ScrollArea className="max-h-[60vh] pr-4"` para darle un tamaño definido y que el scroll sea evidente.
- Agregar un pequeño resumen al inicio: "Mostrando X conceptos en Y categorías" para que el usuario sepa que debe scrollear.
- Mantener los totales (Subtotal, IVA, Total) en el `DialogFooter` fuera del scroll, para que siempre estén visibles.


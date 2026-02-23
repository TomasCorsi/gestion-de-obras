

# Fix: Registrar Movimiento en Stock

## Problema Identificado

El formulario de "Registrar Movimiento" tiene un bug en el componente Select de "Obra (opcional)": usa `<SelectItem value="">Sin obra</SelectItem>` con un valor de string vacio (`""`). Radix UI Select **no soporta valores vacios** como string, lo que hace que el componente se rompa silenciosamente y bloquee la interaccion con el formulario.

Ademas, el estado inicial de `obra_id` es `""` (string vacio), lo cual genera conflictos adicionales con el Select.

## Solucion

1. **Reemplazar el valor vacio** del SelectItem de "Sin obra" por un valor placeholder valido como `"none"`.
2. **Ajustar `handleSubmitMovimiento`** para convertir `"none"` a `undefined` antes de enviar a la base de datos.
3. **Actualizar el estado inicial** de `movFormData.obra_id` para que sea `"none"` en vez de `""`.

## Detalles Tecnicos

**Archivo:** `src/pages/Stock.tsx`

Cambios puntuales:
- Linea 83: Cambiar `obra_id: ""` a `obra_id: "none"` en el estado inicial de `movFormData`
- Linea 186: Igual en `handleNewMovimiento`
- Linea 217: Ajustar la logica de envio: `obra_id: movFormData.obra_id === "none" ? undefined : movFormData.obra_id || undefined`
- Linea 572: Cambiar `<SelectItem value="">Sin obra</SelectItem>` a `<SelectItem value="none">Sin obra</SelectItem>`

Estos cambios son minimos y no afectan el diseno ni la experiencia visual.


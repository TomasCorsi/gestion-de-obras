## Nuevo modo de cálculo: Precio fijo por remito

En `src/components/remitos/AsignarPreciosMasivosDialog.tsx` agregar una tercera opción en el selector "Modo Cálculo":

- **Viajes × Precio** (existente)
- **Cantidad × Precio** (existente)
- **Precio fijo (sin multiplicar)** (nuevo)

### Comportamiento

El precio unitario ingresado por tipo de material se asigna **tal cual** como `precio_total` de cada remito de ese tipo (multiplicador = 1). El campo `precio_unitario` se guarda con el mismo valor y `precio_calc_mode` se persiste como `"fijo"`.

### Cambios técnicos

- Ampliar el tipo del state `mode` a `"viajes" | "cantidad" | "fijo"`.
- Agregar un tercer `RadioGroupItem` con label "Precio fijo".
- En la tabla, cuando `mode === "fijo"`:
  - Ocultar/neutralizar la columna del multiplicador (mostrar "—" en la columna "Viajes/Cantidad") ya que no aplica.
  - Subtotal por fila = `precio` (sin multiplicar).
  - Total estimado = suma de `precio` por cada tipo con valor cargado (un único valor por tipo, no multiplicado por cantidad de remitos).
- En `handleApply`, cuando `mode === "fijo"`, usar `multiplicador = 1` y guardar `precio_calc_mode: "fijo"`.
- Encabezado dinámico de la columna de cantidad: "Viajes" | "Cantidad" | "—".

### Archivos afectados

- `src/components/remitos/AsignarPreciosMasivosDialog.tsx` (única edición).

No requiere cambios de base de datos: `precio_calc_mode` ya es texto libre en la tabla `remitos`.

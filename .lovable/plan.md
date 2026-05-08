## Mostrar cantidad y precio unitario de remitos en el detalle de gastos

En `src/components/maquinarias/GastosMaquinaria.tsx`, la tabla "Detalle de Gastos" sólo muestra el costo total. Para los remitos hay que exponer la cantidad (m2, m3, viajes, etc.) y el precio unitario que ya están en la tabla `remitos` (`cantidad_uni`, `unidad`, `precio_unitario`, `precio_calc_mode`, `cantidad_viajes`, `cantidad`).

### Cambios

1. **Tipo `GastoUnificado`**: agregar campos opcionales `cantidad?: number`, `unidad?: string`, `precioUnitario?: number` para que los tres tipos puedan informar (los de combustible y mantenimiento dejan en blanco lo que no aplica).

2. **Construcción de `gastosUnificados` (línea ~376)**:
   - **Remito**: 
     - Si `precio_calc_mode === "viajes"` → `cantidad = cantidad_viajes`, `unidad = "viajes"`, `precioUnitario = precio_unitario` (o `precio_total / cantidad_viajes` si está vacío).
     - Si no → `cantidad = cantidad_uni ?? cantidad`, `unidad = unidad` (m2, m3, tn, etc.), `precioUnitario = precio_unitario` (o `precio_total / cantidad`).
     - Quitar el "- N viaje(s)" del string de descripción (queda redundante con la nueva columna).
   - **Combustible**: `cantidad = litros`, `unidad = "L"`, `precioUnitario` = precio del mes.
   - **Mantenimiento**: dejar los campos vacíos.

3. **Tabla** (líneas 810-852):
   - Insertar dos columnas nuevas entre "Descripción" y "Operador": **"Cantidad"** (`{cantidad?.toLocaleString()} {unidad}`) y **"P. Unitario"** (`$${precioUnitario?.toLocaleString()}`), alineadas a la derecha y monoespaciadas como "Costo".
   - Mostrar "—" cuando no haya valor.

4. **Export Excel** (línea ~414): agregar las mismas dos columnas al detalle exportado para mantener paridad.

### Resultado

En el detalle se ve, por cada remito, por ejemplo: `120 m3 · $4.500 · $540.000 total`, permitiendo verificar precios unitarios de m2/m3/viajes directamente sin abrir el remito.

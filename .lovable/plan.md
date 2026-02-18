
## Tabla de precios mensuales por producto (Repartidor)

### Objetivo
Agregar una sección de "Precios del Mes" dentro del tab **Repartidor** en la página de Gastos, donde los administradores puedan definir el precio por unidad (litro/kg) de cada producto (combustible, grasa, aceite, urea) para cada mes. La tabla de cargas existente mostrará automáticamente el costo calculado usando esos precios.

### Solución completa

#### Base de datos — nueva tabla `precios_productos_mes`

Se creará una tabla con la siguiente estructura:

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Clave primaria |
| `anio` | integer | Año (ej: 2025) |
| `mes` | integer | Mes 1-12 |
| `producto` | text | 'combustible', 'grasa', 'aceite', 'uria' |
| `precio_unitario` | numeric | Precio por litro o kg |
| `created_at` / `updated_at` | timestamptz | Auditoría |

Constraint único: `(anio, mes, producto)` — solo un precio por producto por mes.

**Políticas RLS:**
- Solo admins y capataces pueden leer y gestionar los precios
- Los maquinistas y repartidores no tienen acceso (la tabla es solo administrativa)

#### Nuevo hook `usePreciosMes.ts`

- `fetchPrecios(anio, mes)`: trae los precios del mes seleccionado
- `upsertPrecio(anio, mes, producto, precio)`: inserta o actualiza un precio (upsert por constraint único)
- Retorna los precios indexados por producto para fácil acceso

#### Nueva UI — Panel de precios en `CombustibleRepartidorTab`

Se agregará un panel colapsable (o un bloque fijo) encima de la tabla con:

**Sub-tab o sección "Precios del Mes":**
- Un selector de mes/año (ya existe en el tab)
- Una tabla compacta con 4 filas: Combustible, Grasa, Aceite, Urea
- Cada fila tiene un input de precio editable con botón "Guardar"
- Muestra un indicador visual si el precio está configurado o no para ese mes

**Tabla de cargas — columna "Costo":**
- Se agregarán dos columnas nuevas: **Precio unit.** y **Costo total**
- El costo se calcula: `cantidad × precio_del_mes_correspondiente`
- Si no hay precio configurado para ese mes/producto, muestra "Sin precio"
- Al final de la tabla, un resumen: **Total del período: $X.XXX**

#### Flujo de uso

```text
Admin abre Gastos → Tab Repartidor
         ↓
Selecciona mes (ej: Marzo 2025)
         ↓
Panel "Precios del mes" muestra las 4 filas de productos
         ↓
Admin ingresa precios y guarda (upsert en BD)
         ↓
La tabla de cargas de ese mes calcula automáticamente
el costo de cada entrega y muestra el total
```

### Archivos a crear/modificar

**1. Migración SQL** (nueva tabla `precios_productos_mes` con RLS)

**2. `src/hooks/usePreciosMes.ts`** (nuevo)
- Query + mutación para leer y guardar precios por mes

**3. `src/components/gastos/CombustibleRepartidorTab.tsx`** (modificar)
- Agregar panel de precios del mes (tabla de 4 productos con inputs editables)
- Agregar columnas "Precio unit." y "Costo" en la tabla de cargas
- Agregar fila de totales al pie de la tabla con el costo total del período

### Diseño del panel de precios

El panel de precios tendrá este aspecto:

```text
┌─────────────────────────────────────────────┐
│ 💰 Precios del Mes — Marzo 2025             │
├──────────────┬───────────────┬──────────────┤
│ Producto     │ Precio/unidad │              │
├──────────────┼───────────────┼──────────────┤
│ 🛢️ Combustible│ $ [    950  ] │ [Guardar]    │
│ 🧴 Grasa     │ $ [   3500  ] │ [Guardar]    │
│ 🫗 Aceite    │ $ [   4200  ] │ [Guardar]    │
│ 💧 Urea      │ $ [    800  ] │ [Guardar]    │
└──────────────┴───────────────┴──────────────┘
```

### Sin cambios en la carga del repartidor (móvil)
La pantalla del repartidor para cargar entregas **no se modifica**. Los precios son solo para el cálculo administrativo en la vista de Gastos.

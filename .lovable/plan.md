## Diagnóstico de "Gastos Generales"

Después de revisar `GastosGeneralesTab.tsx`, `FilterBar.tsx` y `useOtrosGastos.ts`, encontré 3 problemas que explican lo que ves (hoy 01/06/2026):

### 1. El filtro de **Año** no filtra nada
En `FilterBar.tsx`, `handleYearChange` solo recalcula el rango de fechas si **además** hay un mes seleccionado. Si elegís "2026" + "Todos los meses", no se aplica ningún `fechaDesde/fechaHasta` → la tabla muestra gastos de cualquier año. El año funciona como un selector visual sin efecto.

Además `filterByDateAndObra` no contempla el año por separado: solo mira `fechaDesde/fechaHasta`.

### 2. Lentitud al crear / tipear
Dos causas combinadas:

- **Animación por fila**: cada `<TableRow>` tiene `style={{ animationDelay: ${index * 30}ms }}` + `animate-fade-in`. Con 100+ gastos son 100+ animaciones encoladas (la última arranca a los 3s) y el navegador repinta toda la tabla en cada render. Como `filtered` se recalcula al tipear en el buscador o al crear/editar un gasto (invalidación de React Query), **se reanima toda la tabla cada vez** → sensación de freeze.
- **Sin paginación**: se renderizan todos los gastos del histórico en un solo `<Table>`. Al guardar un gasto nuevo, React vuelve a montar todas las filas + animaciones.

### 3. Filtro de fechas con bug de zona horaria
`filterByDateAndObra` hace `new Date(item.fecha)` sobre un string `YYYY-MM-DD`. Eso lo interpreta como UTC 00:00, así que un gasto del 01/05/2026 puede caer fuera del rango "01/05 → 31/05" en zona Argentina (UTC-3). Va contra el estándar del proyecto (`mem://tech/date-handling-standard-v2`: usar `parseISO` y comparar como local).

---

## Plan de arreglos

### A. `src/components/shared/FilterBar.tsx`
- Hacer que el **Año filtre solo**: si hay año seleccionado y no hay mes, aplicar rango `01/01/Año → 31/12/Año` y emitirlo en `onFilterChange`. Ej.: elegir "2026" sin mes → muestra solo gastos del 01/01/2026 al 31/12/2026.
- Hacer que al cambiar Año siempre se emita el rango actualizado (no solo cuando hay mes).
- Al limpiar filtros, mantener el rango del año actual seleccionado en vez de quedar sin filtro.

### B. `src/components/shared/FilterBar.tsx` → `filterByDateAndObra`
- Reemplazar `new Date(item.fecha)` por `parseISO(item.fecha)` y comparar contra `startOfDay(fechaDesde)` / `endOfDay(fechaHasta)` para evitar corrimiento por TZ.

### C. `src/components/proveedores/GastosGeneralesTab.tsx`
- **Quitar `animate-fade-in` + `animationDelay` por fila** (causa principal de la lentitud). Mantener hover.
- **Agregar paginación simple** (50 filas por página) para no renderizar todo el histórico de golpe.
- Memoizar `activeObras` con `useMemo`.

### D. Verificación
- Crear un gasto → el dialog debe cerrar al instante.
- Año = 2026 sin mes → solo se ven gastos de 2026.
- Año = 2025 → solo gastos de 2025.
- Elegir mes Mayo 2026 → rango correcto sin corrimiento de día.
- Tipear en el buscador → la tabla no debe "saltar" ni reanimarse.

### Archivos a modificar
- `src/components/shared/FilterBar.tsx` (lógica de año + `filterByDateAndObra`)
- `src/components/proveedores/GastosGeneralesTab.tsx` (quitar animación por fila, paginación, memo)

**Nota**: el cambio en `FilterBar` afecta a otros módulos que lo usan (Combustible, etc.). El efecto es positivo en todos: el filtro de año empieza a funcionar y se corrige el bug de TZ. Si preferís limitar el arreglo solo a Gastos Generales, decímelo y lo aíslo.

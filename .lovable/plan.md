

## Plan: Agregar vista "Sin Vacaciones" en el módulo de Vacaciones

### Resumen
Agregar una nueva pestaña o filtro en la sección de vacaciones que muestre rápidamente los empleados activos que **no tienen ninguna vacación cargada en el año actual**, permitiendo identificar quién falta por tomar sus vacaciones.

### Opciones de implementación

**Opción A: Nueva pestaña "Sin Vacaciones"**
Agregar una cuarta pestaña junto a Solicitudes, Calendario y Saldo.

**Opción B: Filtro rápido en la pestaña "Saldo por Empleado"** (Recomendada)
Agregar un filtro/toggle en la tabla existente que permita ver solo los empleados con 0 días usados.

Voy a implementar la **Opción B** ya que aprovecha la infraestructura existente y es más rápida de usar.

### Cambios a realizar

**1. Modificar `SaldoVacacionesTable.tsx`**
- Agregar un filtro toggle: "Mostrar solo sin vacaciones"
- Agregar KPIs rápidos arriba de la tabla mostrando:
  - Total empleados activos
  - Con vacaciones cargadas
  - Sin vacaciones cargadas (destacado)
- Ordenar por defecto mostrando primero los que no tienen vacaciones

**2. Diseño de la interfaz mejorada**

```text
+---------------------------------------------------------------+
| Saldo por Empleado                                             |
+---------------------------------------------------------------+
| [Buscar empleado...]                                          |
+---------------------------------------------------------------+
| KPIs:                                                          |
| Total: 71  |  Con vacaciones: 18  |  SIN VACACIONES: 53       |
+---------------------------------------------------------------+
| Filtros:                                                       |
| [x] Mostrar solo sin vacaciones    [ ] Ordenar por apellido   |
+---------------------------------------------------------------+
| Empleado         | Antigüedad | Base | Usados | Disponibles   |
+------------------+------------+------+--------+---------------+
| ADAMS, LUIN      | 2 años     | 14   | 0      | 14           |
| ALBORNOZ, GUILL. | 3 años     | 14   | 0      | 14           |
| ...              |            |      |        |               |
+---------------------------------------------------------------+
```

### Archivos a modificar
- `src/components/personal/SaldoVacacionesTable.tsx`
  - Agregar estado `showSinVacaciones`
  - Agregar cálculo de estadísticas (total, con vacaciones, sin vacaciones)
  - Agregar UI de filtros y KPIs
  - Modificar `filteredSaldos` para aplicar el filtro

### Detalles tecnicos

```typescript
// Estadísticas
const stats = useMemo(() => {
  const total = saldos.length;
  const sinVacaciones = saldos.filter(s => s.diasUsados === 0).length;
  const conVacaciones = total - sinVacaciones;
  return { total, conVacaciones, sinVacaciones };
}, [saldos]);

// Filtro
const [showSinVacaciones, setShowSinVacaciones] = useState(false);

const filteredSaldos = useMemo(() => {
  let result = saldos;
  
  // Filtro de búsqueda
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    result = result.filter(s =>
      s.nombre.toLowerCase().includes(term) ||
      s.apellido.toLowerCase().includes(term)
    );
  }
  
  // Filtro sin vacaciones
  if (showSinVacaciones) {
    result = result.filter(s => s.diasUsados === 0);
  }
  
  // Ordenar: sin vacaciones primero
  return result.sort((a, b) => {
    if (a.diasUsados === 0 && b.diasUsados > 0) return -1;
    if (a.diasUsados > 0 && b.diasUsados === 0) return 1;
    return a.apellido.localeCompare(b.apellido);
  });
}, [saldos, searchTerm, showSinVacaciones]);
```

### Comportamiento esperado
- Al abrir la pestaña "Saldo por Empleado", se ve el total y cuántos no tienen vacaciones
- Un checkbox permite filtrar solo los que no tienen vacaciones cargadas
- Por defecto, la tabla ordena mostrando primero los empleados sin vacaciones
- Se puede combinar con la búsqueda por nombre


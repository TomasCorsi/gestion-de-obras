

## Plan: Panel de Empleados Sin Parte Diario

### Resumen
Agregar una nueva sección en la vista administrativa de Partes Diarios que muestre qué empleados activos **no han cargado** su parte diario para una fecha o rango de fechas determinado. Esto permitirá un seguimiento rápido del cumplimiento sin importar si el empleado está registrado en la app o no.

### Cambios a realizar

**1. Crear nuevo hook `useEmpleadosSinParte`**
- Consulta todos los empleados activos de la tabla `personal`
- Consulta los partes diarios para el rango de fechas seleccionado
- Compara y retorna la lista de empleados que NO tienen parte para esa fecha
- Incluye información como: nombre, apellido, legajo, rol y estado de vinculación con usuario

**2. Crear nuevo componente `EmpleadosSinParteTab`**
- Selector de fecha (hoy, ayer, o un rango)
- Tabla con los empleados que faltan:
  - Legajo
  - Nombre completo
  - Rol
  - Estado de registro (si tiene user_id vinculado o no)
- Badge indicando si el empleado está "Registrado" o "Sin cuenta"
- Botón para exportar a Excel la lista de faltantes

**3. Modificar `ParteDiarioAdminView`**
- Agregar una tercera pestaña "Ausentes" o "Faltantes" junto a "Listado" y "Rendimiento"
- Mostrar un KPI adicional indicando cuántos empleados no han cargado parte hoy

### Diseño de la interfaz

```text
+---------------------------------------------------------------+
| Partes Diarios - Administración                               |
+---------------------------------------------------------------+
| [Listado]   [Rendimiento]   [Faltantes]                       |
+---------------------------------------------------------------+
| KPIs:  Total: 21  |  Completados: 15  |  Borradores: 6  |     |
|        Empleados únicos: 18  |  SIN PARTE HOY: 53            |
+---------------------------------------------------------------+

[Tab Faltantes seleccionada]

+---------------------------------------------------------------+
| Empleados sin Parte Diario                                    |
| Fecha: [Hoy ▼]                              [Exportar Excel]  |
+---------------------------------------------------------------+
| Legajo | Empleado              | Rol        | Estado          |
+--------+-----------------------+------------+-----------------+
| 001    | ADAMS, LUIN ANTONIO   | Chofer     | Sin cuenta      |
| 002    | ALBORNOZ, GUILLERMO   | Sereno     | Sin cuenta      |
| 003    | BARRIOS, NICOLAS      | Maquinista | Sin cuenta      |
| ...    | ...                   | ...        | ...             |
+---------------------------------------------------------------+
| Mostrando 53 empleados sin parte para hoy                     |
+---------------------------------------------------------------+
```

### Archivos a crear
- `src/hooks/useEmpleadosSinParte.ts`
- `src/components/parte-diario/EmpleadosSinParteTab.tsx`

### Archivos a modificar
- `src/components/parte-diario/ParteDiarioAdminView.tsx` - agregar tercera pestaña
- `src/components/parte-diario/ParteDiarioKPIs.tsx` - agregar KPI de faltantes

### Detalles Tecnicos

**Hook `useEmpleadosSinParte`:**
```typescript
interface EmpleadoSinParte {
  id: string;
  nombre: string | null;
  apellido: string | null;
  legajo: string | null;
  rol: string;
  tieneUsuario: boolean; // user_id !== null
}

function useEmpleadosSinParte(fecha: string) {
  // 1. Obtener todos los empleados activos
  // 2. Obtener los personal_id de partes_diarios para esa fecha
  // 3. Filtrar empleados que NO están en la lista de partes
  // 4. Retornar con indicador de si tienen cuenta de usuario
}
```

**Componente `EmpleadosSinParteTab`:**
- Usa el hook anterior
- Selector de fecha con opciones rápidas: Hoy, Ayer, Fecha específica
- Tabla ordenada por apellido
- Búsqueda por nombre/legajo
- Exportación a Excel

### Comportamiento esperado
- Al abrir la pestaña "Faltantes", se muestra por defecto los empleados que no han cargado parte **hoy**
- Se puede cambiar la fecha para ver faltantes de días anteriores
- Se distingue claramente si el empleado tiene cuenta en la app o no
- Se puede exportar la lista para seguimiento manual

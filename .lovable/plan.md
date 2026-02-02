
# Plan: Mejora de la Vista Administrativa de Partes Diarios

## Resumen
Rediseñar la vista administrativa para que sea mas simple, clara y rapida de consultar. Se agregarán indicadores visuales, una vista de resumen por día, filtros mas accesibles y exportación a Excel.

## Cambios Propuestos

### 1. Panel de Resumen Rápido (KPIs del Día/Período)
Agregar cards con métricas clave en la parte superior:

```text
+-------------------+-------------------+-------------------+-------------------+
|   📋 Total        |  ✅ Completados   |   ⏳ Borradores   |   👷 Empleados    |
|      45           |      38           |        7          |       12          |
|   partes          |   (84%)           |    pendientes     |   activos hoy     |
+-------------------+-------------------+-------------------+-------------------+
```

### 2. Vista por Tarjetas (Card View) como opción alternativa
Agregar toggle para cambiar entre vista de tabla y vista de tarjetas:

```text
[ Tabla ] [ Tarjetas ]

+----------------------------------------+----------------------------------------+
| 📅 Hoy - 02/02/2026                    | 📅 Hoy - 02/02/2026                    |
| Edgar Zacarías · Maquinista            | Hugo Carrizo · Chofer                  |
| 🏗️ Pte. FIGUEROA ALCORTA              | 🏗️ Ruta Nacional 9                    |
| ⏰ 07:00 - 17:00                       | ⏰ 06:30 - 16:00                       |
| 🚜 Pala 02 (ABC123)                    | 🚚 Camión 04 (XYZ789)                  |
| [✅ Completado]              [👁️] [🗑️]  | [⏳ Borrador]                  [👁️] [🗑️]  |
+----------------------------------------+----------------------------------------+
```

### 3. Filtros Más Accesibles
Mover los filtros principales fuera del popover para acceso rápido:

```text
+----------------------------------------------------------+
| 🔍 Buscar empleado...  | Hoy ▼ | Todas las obras ▼ | Estado ▼ | ⚙️ Más filtros | 📥 Excel |
+----------------------------------------------------------+
```

### 4. Agrupación por Fecha
Agregar opción para ver los partes agrupados por día con contadores:

```text
📅 Hoy - Domingo 02/02/2026                           [12 partes - 10 completados]
├─ Edgar Zacarías (Maquinista) · Pte. FIGUEROA ALCORTA · ✅
├─ Hugo Carrizo (Chofer) · Ruta Nacional 9 · ✅
└─ Alan Wertz (Maquinista) · Obra Norte · ⏳ Borrador

📅 Ayer - Sábado 01/02/2026                           [15 partes - 15 completados]
├─ ...
```

### 5. Tabla Compacta y Optimizada
Simplificar la tabla actual combinando columnas:

```text
| Fecha/Empleado          | Ubicación              | Horario           | Estado        | ⚡ |
|-------------------------|------------------------|-------------------|---------------|---|
| 02/02 - Edgar Zacarías  | FIGUEROA · Pala 02     | 07:00 → 17:00    | ✅ Completado | 👁️ 🗑️ |
| Maquinista              |                        |                   |               |    |
```

### 6. Exportación a Excel
Agregar botón para descargar el listado filtrado en formato Excel.

### 7. Paginación
Agregar paginación para manejar grandes cantidades de datos (25/50/100 por página).

## Archivos a Modificar

### `src/components/parte-diario/ParteDiarioAdminView.tsx`
- Agregar panel de KPIs con métricas calculadas
- Implementar toggle para cambiar entre vista tabla y tarjetas
- Mover filtros principales a la barra de herramientas
- Agregar botón de exportación Excel
- Implementar paginación
- Optimizar diseño de la tabla actual

### `src/components/parte-diario/ParteDiarioQuickFilters.tsx` (nuevo)
Componente para los filtros de acceso rápido en la barra de herramientas:
- Selector de fecha (Hoy, Esta semana, Este mes, Personalizado)
- Selector de obra
- Selector de estado

### `src/components/parte-diario/ParteDiarioCardView.tsx` (nuevo)
Vista alternativa en formato de tarjetas:
- Cards agrupadas por fecha
- Información condensada y visual
- Acciones rápidas (ver, eliminar)

### `src/components/parte-diario/ParteDiarioKPIs.tsx` (nuevo)
Panel de métricas rápidas:
- Total de partes en el período
- Porcentaje completados vs borradores
- Empleados activos
- Horas totales trabajadas (opcional)

## Flujo de Implementación

1. Crear componente de KPIs con métricas del período filtrado
2. Crear filtros rápidos accesibles en la barra de herramientas
3. Implementar vista de tarjetas como alternativa
4. Agregar toggle para cambiar entre vistas
5. Implementar exportación a Excel
6. Agregar paginación
7. Optimizar la tabla compactando información

## Detalles Técnicos

### Cálculo de KPIs
```typescript
const kpis = useMemo(() => ({
  total: filteredPartes.length,
  completados: filteredPartes.filter(p => p.estado === 'completado').length,
  borradores: filteredPartes.filter(p => p.estado === 'borrador').length,
  empleadosUnicos: new Set(filteredPartes.map(p => p.personal_id)).size,
}), [filteredPartes]);
```

### Agrupación por Fecha
```typescript
const partesPorFecha = useMemo(() => {
  return filteredPartes.reduce((acc, parte) => {
    const fecha = parte.fecha;
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(parte);
    return acc;
  }, {} as Record<string, ParteDiario[]>);
}, [filteredPartes]);
```

### Exportación Excel
```typescript
const handleExportExcel = () => {
  const data = filteredPartes.map(p => ({
    Fecha: format(parseISO(p.fecha), 'dd/MM/yyyy'),
    Empleado: `${p.personal?.nombre} ${p.personal?.apellido}`,
    Rol: p.personal?.rol,
    Obra: p.obras?.nombre,
    Máquina: p.maquinarias?.codigo,
    Entrada: p.hora_entrada,
    Salida: p.hora_salida,
    Estado: p.estado,
    // ... más campos
  }));
  // Usar xlsx para generar archivo
};
```

## Resultado Esperado
Una interfaz administrativa que permite:
- Ver de un vistazo el estado general de los partes del día/período
- Filtrar rápidamente sin abrir popovers
- Cambiar entre vista detallada (tabla) y vista rápida (tarjetas)
- Exportar datos a Excel para análisis
- Navegar eficientemente con paginación
- Identificar rápidamente partes pendientes (borradores)

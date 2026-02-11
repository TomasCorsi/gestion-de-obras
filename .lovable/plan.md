

## Mejoras al Sistema de Reportes de Campo

### Estado actual
El sistema permite ver observaciones reportadas desde los partes diarios, filtrarlas por estado/fecha/busqueda, y marcarlas como atendidas con tecnico y notas de resolucion.

### Mejoras propuestas

**1. Filtro por Maquinaria**
Agregar un selector de maquinaria en la barra de filtros para ver solo los reportes de una maquina especifica. Muy util cuando el mecanico quiere enfocarse en una sola unidad.

**2. Filtro por Obra**
Agregar selector de obra para filtrar reportes segun donde esta trabajando la maquina. Permite al equipo de mantenimiento priorizar por ubicacion.

**3. Agrupar por Maquinaria**
Opcion para agrupar las cards por maquinaria en lugar de verlas todas sueltas. Asi el mecanico ve todas las observaciones pendientes de cada unidad juntas, como un "expediente" por maquina.

**4. Indicador de Antiguedad**
Resaltar visualmente los reportes que llevan muchos dias sin atender (ej: mas de 3 dias en amarillo, mas de 7 dias en rojo). Esto ayuda a priorizar lo urgente.

**5. Vincular con Mantenimiento**
Boton "Crear Mantenimiento" directamente desde un reporte de campo. Al presionarlo, se abre el formulario de nuevo mantenimiento con la maquinaria ya preseleccionada y la descripcion del reporte como referencia.

**6. Contador por Maquinaria en KPIs**
Agregar un KPI que muestre cuantas maquinas distintas tienen reportes pendientes, no solo el total de reportes.

### Detalle tecnico

| Mejora | Archivos afectados | Complejidad |
|---|---|---|
| Filtro por maquinaria | `ObservacionesCampoTab.tsx` | Baja |
| Filtro por obra | `ObservacionesCampoTab.tsx`, `useObservacionesMaquina.ts` (agregar join obra) | Baja |
| Agrupar por maquinaria | `ObservacionesCampoTab.tsx` (logica de agrupacion + UI collapsible) | Media |
| Indicador de antiguedad | `ObservacionesCampoTab.tsx` (calculo de dias + badge visual) | Baja |
| Vincular con mantenimiento | `ObservacionesCampoTab.tsx`, `MantenimientoPage.tsx` (estado compartido o navegacion con params) | Media |
| KPI maquinas afectadas | `ObservacionesCampoTab.tsx` (useMemo adicional) | Baja |

### Orden de implementacion sugerido

1. Filtro por maquinaria + filtro por obra (rapido, alto impacto)
2. Indicador de antiguedad (visual, facil)
3. KPI maquinas afectadas (rapido)
4. Agrupar por maquinaria (organizacion visual)
5. Vincular con mantenimiento (funcionalidad avanzada)


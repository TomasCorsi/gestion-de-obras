

# Plan: Mejoras al Calendario de Vacaciones

## Objetivo
Hacer el calendario más intuitivo y fácil de interpretar, mejorando la visualización y agregando funcionalidades que ayuden a entender rápidamente la disponibilidad del personal.

## Mejoras Propuestas

### 1. Resumen mensual en el header
Agregar indicadores visuales en la parte superior mostrando:
- Total de personas de licencia este mes
- Días con mayor cantidad de ausencias
- Rango de fechas visible

### 2. Diferenciación por tipo de licencia (colores adicionales)
Actualmente solo se diferencia entre Aprobada (verde) y Pendiente (amarillo). Podemos agregar:
- Vacaciones: Verde/Amarillo (como ahora)
- Licencia Médica: Azul
- Permiso Personal: Violeta
- Otro: Gris

Con un toggle para elegir entre "Ver por Estado" o "Ver por Motivo".

### 3. Contador de personas ausentes por día
Mostrar un pequeño badge en la esquina de cada día indicando cuántas personas están de licencia (ej: "3 ausentes"), visible incluso sin hacer hover.

### 4. Barra de timeline horizontal
Agregar una vista alternativa de timeline/Gantt debajo del calendario que muestre las licencias como barras horizontales continuas, facilitando ver la duración completa de cada licencia.

### 5. Filtros rápidos
- Por empleado específico (resaltar solo sus licencias)
- Por motivo de licencia
- Mostrar/ocultar rechazadas

### 6. Indicador de días críticos
Resaltar días donde hay muchas ausencias simultáneas (ej: más de 3 personas) con un borde rojo para alertar sobre posibles problemas de cobertura.

## Cambios Técnicos

### Archivo: `src/components/personal/CalendarioVacaciones.tsx`

**Nuevas funcionalidades:**

1. **Estado para modo de visualización**
```text
- viewMode: "estado" | "motivo" (toggle para cambiar colores)
- empleadoFilter: string | null (filtrar por empleado)
- showRejected: boolean (mostrar/ocultar rechazadas)
```

2. **Colores por motivo**
```text
- vacaciones: bg-emerald-500 (verde esmeralda)
- licencia_medica: bg-blue-500 (azul)
- permiso_personal: bg-violet-500 (violeta)  
- otro: bg-slate-500 (gris)
```

3. **Estadísticas del mes**
   - Calcular total de personas ausentes en el mes visible
   - Identificar el día con más ausencias
   - Mostrar estos datos en un resumen arriba del calendario

4. **Badge de contador por día**
   - Mostrar número de ausencias en la esquina superior derecha de cada celda
   - Usar color rojo si supera umbral crítico (configurable, default 3)

5. **Sección de Timeline (opcional, debajo del calendario)**
   - Vista de barras horizontales mostrando cada licencia
   - Scroll horizontal si hay muchas licencias
   - Click para ver detalles

6. **Controles de filtro en el header**
   - Dropdown para filtrar por empleado
   - Toggle para ver por estado vs motivo
   - Checkbox para incluir rechazadas

## Flujo de Usuario Mejorado

```text
Antes:
- Solo diferencia estado (aprobada/pendiente)
- Sin estadísticas generales
- Hay que hacer click para ver detalles

Después:
- Vista rápida de cuántas personas faltan cada día
- Colores distintos por tipo de licencia
- Resumen mensual visible
- Alertas en días críticos
- Filtros para encontrar información específica
```

## Beneficios
- Identificación inmediata de días con problemas de cobertura
- Mejor planificación al ver tipos de licencia diferenciados
- Estadísticas útiles para gestión de recursos humanos
- Navegación más eficiente con filtros


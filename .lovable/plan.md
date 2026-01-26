
# Plan: Mejorar Visualización de Vacaciones en Calendario

## Problema Actual
- El calendario solo muestra las iniciales del empleado (ej: "JP")
- Hay que hacer hover para ver el nombre completo y las fechas
- Las celdas son pequeñas y la información es difícil de leer

## Mejoras Propuestas

### 1. Mostrar nombre completo en las celdas
- Cambiar de iniciales a nombre abreviado: "J. Pérez" en lugar de "JP"
- Aumentar el tamaño mínimo de las celdas para acomodar más texto

### 2. Mejorar el tamaño y contraste de los badges
- Aumentar el padding y tamaño de fuente de los badges
- Mejorar los colores para mayor visibilidad

### 3. Agregar panel lateral con lista del día seleccionado
- Al hacer clic en un día, mostrar un panel con el detalle completo de todos los empleados de vacaciones
- Incluir: nombre completo, legajo, fechas, motivo, días totales y estado

### 4. Mejorar el tooltip con más información
- Agregar legajo del empleado
- Mostrar días totales de vacaciones
- Mostrar el motivo (vacaciones, licencia médica, etc.)
- Formatear fechas de forma más legible

## Cambios Técnicos

### Archivo: `src/components/personal/CalendarioVacaciones.tsx`

| Sección | Cambio |
|---------|--------|
| Estado | Agregar `selectedDay` para el día seleccionado |
| Celdas | Aumentar `min-h-24` a `min-h-28` |
| Badges | Mostrar apellido abreviado + nombre inicial (ej: "Pérez, J.") |
| Badges | Aumentar padding de `px-1.5 py-0.5` a `px-2 py-1` |
| Tooltip | Agregar legajo, motivo y días totales |
| Nuevo | Panel lateral derecho con detalle del día seleccionado |

### Estructura del panel lateral

```text
+------------------------------------------+
| Vacaciones - 15 de Enero 2026            |
+------------------------------------------+
| [Verde] PÉREZ, Juan                      |
|   Legajo: 102                            |
|   Del 10/01 al 20/01 (10 días)           |
|   Motivo: Vacaciones                     |
|   Estado: Aprobada                       |
+------------------------------------------+
| [Amarillo] GARCÍA, María                 |
|   Legajo: 205                            |
|   Del 12/01 al 18/01 (6 días)            |
|   Motivo: Licencia médica                |
|   Estado: Pendiente                      |
+------------------------------------------+
```

### Integración con datos de personal
Para mostrar el legajo, necesitamos que el componente reciba también la lista de personal o que la tabla `vacaciones` incluya el join con el legajo.

## Resultado Esperado
- Información más visible sin necesidad de hover
- Panel de detalle completo al seleccionar un día
- Mejor experiencia para identificar rápidamente quién está de vacaciones

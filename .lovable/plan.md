
# Plan: Rediseño Simplificado del Calendario de Vacaciones

## Problema Identificado
El calendario actual está sobrecargado con:
- 3 tarjetas de estadísticas en el header
- Filtros por empleado, toggle de modo de vista, checkbox
- Badges con contador en cada día
- Iconos de alerta en días críticos
- Panel lateral de detalles
- Timeline Gantt debajo del calendario
- Múltiples leyendas de colores
- Tooltips en cada elemento

Todo esto hace que sea difícil de entender a primera vista.

## Propuesta: Vista de Lista Mensual

Cambiar a un formato de **lista cronológica** en lugar de calendario tradicional, mucho más fácil de leer:

```text
+--------------------------------------------------+
|  < Enero 2026 >                    [+ Nueva]     |
+--------------------------------------------------+
|  ENERO                                           |
|  ──────────────────────────────────────────      |
|  15-22  ● García, Juan         Vacaciones        |
|  18-25  ● López, María         Licencia Médica   |
|  20-28  ○ Pérez, Carlos        Vacaciones (pend) |
+--------------------------------------------------+
```

### Características de la Nueva Vista

1. **Header Simple**
   - Solo navegación de mes (flechas + nombre del mes)
   - Botón para agregar nueva solicitud

2. **Lista Cronológica**
   - Una fila por cada licencia
   - Formato: `Fechas | Indicador | Empleado | Motivo`
   - Verde (●) = Aprobada, Amarillo (○) = Pendiente
   - Ordenado por fecha de inicio

3. **Agrupación Opcional**
   - Por defecto: lista simple ordenada por fecha
   - Toggle para agrupar por empleado o por motivo

4. **Detalles al Click**
   - Al hacer click en una fila, expandir para mostrar más info
   - Sin panel lateral ni diálogos adicionales

5. **Mini-Calendario Opcional**
   - Un pequeño calendario visual al costado (como el de react-day-picker)
   - Los días con licencias se marcan con un punto
   - Click en un día filtra la lista

## Cambios Técnicos

### Archivo: `src/components/personal/CalendarioVacaciones.tsx`

**Reemplazo completo del componente** con estructura simplificada:

1. **Estados mínimos**
   - `mesActual`: navegación de meses
   - `expandedId`: para expandir detalles de una fila
   - `groupBy`: "fecha" | "empleado" | "motivo" (opcional)

2. **Estructura del componente**
```text
- Header con navegación del mes
- Mini-calendario visual (opcional, pequeño al costado)
- Lista de licencias del mes seleccionado
  - Cada fila muestra: rango de fechas, indicador visual, nombre, motivo
  - Click expande para ver observaciones y fechas exactas
```

3. **Colores simplificados**
   - Solo 2 colores: verde (aprobada) y amarillo (pendiente)
   - Sin diferenciación por motivo (se muestra como texto)

4. **Sin elementos distractores**
   - Sin badges de contador
   - Sin alertas de días críticos
   - Sin timeline
   - Sin estadísticas del mes
   - Sin múltiples filtros

## Alternativa: Vista Híbrida

Si preferís mantener algo del calendario tradicional, podemos hacer una versión "lite":

1. **Calendario compacto** (solo muestra puntos de colores, sin nombres)
2. **Lista debajo** mostrando las licencias del mes
3. Click en un día del calendario filtra la lista

## Beneficios del Rediseño

- **Escaneo rápido**: Ves todas las licencias del mes de un vistazo
- **Menos clicks**: La info está visible directamente, sin hover ni tooltips
- **Mobile-friendly**: Una lista se adapta mejor a pantallas pequeñas
- **Fácil de entender**: Formato familiar tipo agenda/timeline

## Flujo de Usuario

```text
Antes:
- Calendario lleno de badges, colores, iconos
- Hay que hacer hover para ver nombres
- Muchos controles y filtros
- Confuso determinar quién está de licencia

Después:
- Lista clara con todas las licencias
- Nombre y fechas visibles directamente
- Un solo indicador de estado (color)
- Navegación simple por mes
```

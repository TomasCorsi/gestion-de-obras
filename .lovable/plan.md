

## Historial de entregas por dia para el Repartidor

### Idea
Agregar un selector de fecha simple (flechas izquierda/derecha + fecha) arriba de la lista de entregas en la pantalla de inicio del repartidor. Por defecto muestra "Hoy", y con las flechas puede navegar a dias anteriores para consultar sus entregas pasadas.

### Cambios

**1. `src/pages/ParteDiario.tsx`**
- Cambiar el filtro de `cargasHoy` para usar una fecha seleccionada (`selectedDate`) en lugar de siempre `todayStr`
- Agregar estado `selectedDate` (default: hoy)
- Pasar `selectedDate` y callbacks `onPrevDay`/`onNextDay` al `ParteDiarioHomeView`

**2. `src/components/parte-diario/ParteDiarioHomeView.tsx`**
- Recibir nuevas props: `selectedDate`, `onPrevDay`, `onNextDay`
- Reemplazar el titulo fijo "Entregas de hoy" por un mini-navegador de fecha:
  ```
  [<]  Mie 12 Feb 2026  [>]
  ```
  - Flecha izquierda: dia anterior
  - Flecha derecha: dia siguiente (deshabilitada si ya es hoy)
  - Si es hoy, mostrar "Hoy" junto a la fecha
- Ajustar el mensaje vacio para reflejar la fecha seleccionada
- El boton "Entrega" solo se habilita cuando la fecha es hoy

### Flujo
1. El repartidor abre la app y ve las entregas de hoy (comportamiento actual)
2. Toca la flecha izquierda y ve las entregas de ayer
3. Puede seguir retrocediendo para consultar dias anteriores
4. La flecha derecha lo trae de vuelta hasta hoy
5. Solo puede registrar nuevas entregas cuando esta viendo "Hoy"

### Detalle tecnico
- No se necesitan cambios en la base de datos
- No se necesitan nuevos hooks: el `useCargasRepartidor` ya trae todas las cargas del repartidor, solo se filtra en frontend por la fecha seleccionada
- Se usa `date-fns` (ya instalado) para formatear y navegar entre fechas

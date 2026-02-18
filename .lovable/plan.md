
## Corregir scroll en Combobox y bloqueo del navegador de fechas

### Problema 1: Sin scroll táctil en los selectores (Combobox)

En `src/components/ui/combobox.tsx`, el componente `CommandList` no tiene una altura máxima definida. En dispositivos móviles, cuando la lista de operadores, obras o maquinarias es larga, el popover crece sin límite y no permite hacer scroll con el dedo porque no hay un contenedor con `overflow-y: auto` y el flag `touch-action` apropiado.

**Solución**: Agregar `max-h-60 overflow-y-auto overscroll-contain` al `CommandList`, y asegurarse de que el `PopoverContent` tenga un `max-h` para no salir de la pantalla. También se agrega `-webkit-overflow-scrolling: touch` a través de la clase `touch-pan-y` de Tailwind para garantizar scroll suave en iOS.

### Problema 2: El botón "siguiente día" se bloquea y no puede volver al día de hoy

En `src/pages/ParteDiario.tsx`, la variable `isToday` se calcula así:

```typescript
const todayStr = new Date().toISOString().split('T')[0];
const selectedDateStr = selectedDate.toISOString().split('T')[0];
const isToday = selectedDateStr === todayStr;
```

El método `.toISOString()` siempre devuelve la fecha en **UTC**. En Argentina (UTC-3), si son las 21:01 hs locales, `new Date().toISOString()` devuelve `"2025-xx-xxT00:01:00Z"` — es decir, **la fecha de mañana en UTC**. Esto hace que `isToday` sea `false` aunque el usuario esté en el "día de hoy" local, lo que causa:

- Que el botón "siguiente" no esté deshabilitado correctamente
- Que se pueda avanzar más allá de hoy
- Que la lógica de `handleNextDay` permita una fecha futura, y luego el usuario ya no puede avanzar más pero tampoco puede retroceder (porque no hay cargas)

**Adicionalmente**, en `ParteDiarioHomeView.tsx`, el botón "Entrega" está `disabled={!isTodayProp}`, por lo que cuando el bug activa incorrectamente `isToday = false`, el repartidor tampoco puede registrar nuevas entregas.

**Solución**: Reemplazar el cálculo basado en `toISOString()` (UTC) por uno basado en la fecha local del dispositivo usando `toLocaleDateString` con formato `'sv-SE'` (que devuelve `YYYY-MM-DD` en hora local), o simplemente construyendo el string de fecha local manualmente:

```typescript
// Antes (buggy en zonas horarias UTC-):
const todayStr = new Date().toISOString().split('T')[0]; // USA UTC

// Después (correcto):
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
```

Lo mismo para `selectedDateStr` y para la guardia en `handleNextDay`.

---

### Archivos a modificar

**1. `src/components/ui/combobox.tsx`**
- Agregar `max-h-[280px] overflow-y-auto overscroll-contain` al `CommandList`
- Agregar `max-h-[80vh]` al `PopoverContent` para que no desborde la pantalla en móvil

**2. `src/pages/ParteDiario.tsx`**
- Cambiar el cálculo de `todayStr` y `selectedDateStr` para usar hora local en lugar de UTC
- Actualizar la guardia en `handleNextDay` para comparar strings locales correctamente

Estos dos cambios resuelven ambos problemas reportados sin afectar ninguna otra funcionalidad.

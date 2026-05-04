## Soportar empleados sin legajo en la importación de Sueldos

### Contexto
El nuevo Excel agrega columnas **APELLIDO**, **NOMBRE** y **PUESTO** para identificar a la gente sin legajo (donde `Leg.` aparece como `-`). Hoy el importador omite esos casos porque los nombres no se reconocen y el match contra `personal` solo se hace por legajo.

### Cambios

**1. Migración DB — `sueldos` table**
- Agregar columna `apellido TEXT` (nullable).
- Agregar columna `puesto TEXT` (nullable).
- (`nombre` ya existe — se reutiliza para el primer nombre.)

**2. `src/components/personal/SueldosTab.tsx` — parser**
- Detectar nuevas columnas: `apellido`, `nombre`, `puesto`.
- Si **no hay legajo** (`-` o vacío):
  - Intentar matchear con `personal` por `apellido + nombre` (case-insensitive, trimmed). Si hay match único → usar ese `personal_id` y `legajo` real.
  - Si no hay match → seguir importando igual con `personal_id = null`, marcando estado "sin legajo" en el preview (badge informativo, no error). El registro se guarda usando un legajo sintético `SIN-{apellido}-{nombre}` para que sea único en el período.
- Si **hay legajo** → comportamiento actual (match por legajo).
- Pasar `apellido` y `puesto` al payload de upsert.

**3. `src/hooks/useSueldos.ts`**
- Extender la interfaz `SueldoDB` con `apellido` y `puesto`.

**4. UI**
- Preview y tabla de detalle: mostrar columna **Empleado** combinando `apellido + nombre` (fallback a `nombre` solo) y una columna **Puesto**.
- Badge de estado: "OK" (verde, match por legajo), "Match por nombre" (azul), "Sin legajo" (gris) — todos importables.
- Texto de la zona de upload actualizado: "Columnas: TIPO, Leg., APELLIDO, NOMBRE, PUESTO, SUELDO TOTAL, PARTE BLANCO, PARTE NEGRA".

**5. Tipos Supabase** — se regeneran automáticamente tras la migración.

### Resultado
Los ~20 empleados sin legajo del Excel (jornaleros, serenos, administración, etc.) se van a importar correctamente con apellido, nombre y puesto, y van a sumar a los KPIs de blanco/negro por modalidad.
# Plan: Hacer el sistema más rápido y fluido

## Diagnóstico (datos reales del backend)

Revisé las consultas más lentas y los índices actuales. El problema NO es la UI: es que muchas pantallas piden **tablas enteras** al backend cada vez que se entra, y faltan índices clave.

Top ofensores (tiempo total acumulado):
- `observaciones_maquina_estado` con joins → **838 s** en 11.976 llamadas (mean 70 ms)
- `remitos` con joins (sin filtro) → **644 s** en 3.563 llamadas (mean 180 ms, 2.856 filas cada vez)
- `mantenimientos` con joins → **387 s** en 9.943 llamadas
- `partes_diarios` con joins → **348 s** en 13.341 llamadas
- `cargas_combustible_repartidor` → **263 s** en 2.458 llamadas
- `maquinarias`, `obras` con joins → **+320 s** combinados, llamadas miles de veces

Causas raíz:
1. **Sin paginación**: hooks como `useRemitos`, `useMantenimientos`, `useObservacionesMaquina` traen TODO sin `LIMIT`, y los grids muestran 2.000+ filas en memoria.
2. **Sin caché estable**: React Query refetchea en cada navegación; los hooks no setean `staleTime`, así que cada cambio de pestaña dispara la consulta otra vez.
3. **Faltan índices**:
   - `remitos(fecha DESC, created_at DESC)` — orden default sin índice → scan completo.
   - `partes_diarios(personal_id, fecha DESC)` — el hook de empleado lo usa siempre.
   - `mantenimientos(fecha DESC)`, `cargas_combustible_repartidor(repartidor_id, created_at DESC)`.
   - `observaciones_maquina_estado(atendida, fecha_reporte)`.
4. **Joins anidados pesados** en `observaciones_maquina_estado` (parte_diario → personal + obra) traídos en cada poll.

## Cambios propuestos (3 frentes)

### 1. Base de datos — Crear índices faltantes (migración SQL)

```sql
CREATE INDEX IF NOT EXISTS idx_remitos_fecha_created
  ON public.remitos (fecha DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remitos_obra_fecha
  ON public.remitos (obra_id, fecha DESC) WHERE obra_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_remitos_desde_lower
  ON public.remitos (lower(desde));

CREATE INDEX IF NOT EXISTS idx_partes_personal_fecha
  ON public.partes_diarios (personal_id, fecha DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partes_fecha
  ON public.partes_diarios (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha
  ON public.mantenimientos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_maquinaria_fecha
  ON public.mantenimientos (maquinaria_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_cargas_rep_repartidor_created
  ON public.cargas_combustible_repartidor (repartidor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cargas_rep_fecha
  ON public.cargas_combustible_repartidor (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_obs_maq_atendida_fecha
  ON public.observaciones_maquina_estado (atendida, fecha_reporte DESC);

CREATE INDEX IF NOT EXISTS idx_horas_maquina_obra_fecha
  ON public.horas_maquina (obra_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cargas_combustible_obra_fecha
  ON public.cargas_combustible (obra_id, fecha DESC);
```

Impacto esperado: las consultas con `ORDER BY fecha DESC` y filtros por FK pasan de scan secuencial a index scan. En tablas de 2-4K filas, mean_ms baja de 70-180 ms a < 20 ms.

### 2. React Query — Caché agresivo y `staleTime` por hook

Aplicar a los hooks de listas grandes (`useRemitos`, `useMantenimientos`, `useObservacionesMaquina`, `useCargasRepartidor`, `useMaquinarias`, `useObras`, `usePersonal`):

```ts
useQuery({
  queryKey: [...],
  queryFn: ...,
  staleTime: 5 * 60 * 1000,   // 5 min: no refetchea al navegar
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false, // ya está global, asegurar por hook
  refetchOnMount: false,       // usar caché si está fresca
})
```

Las mutaciones siguen invalidando con `queryClient.invalidateQueries`, así que los datos quedan consistentes; lo que evitamos es el refetch automático al cambiar de página.

### 3. Frontend — Reducir payload por pantalla

- **`useRemitos`, `useMantenimientos`, `useCargasRepartidor`**: agregar paginación server-side (50-100 filas por página) o filtro por defecto del mes en curso. Hoy traen TODAS las filas históricas en cada visita.
- **`useObservacionesMaquina`**: filtrar `atendida = false` por defecto y traer las atendidas solo al cambiar de pestaña.
- **`useMaquinarias` en selectores**: usar `SECURITY DEFINER` view tipo `maquinarias_selector` (igual que `personal_selector`) que devuelva solo `id, codigo, nombre, patente`.

## Implementación por fases

1. **Fase 1 (rápida, impacto alto)** — Migración de índices + setear `staleTime` global y por hook crítico. Sin tocar UI. Estimado: 30-50% menos latencia percibida.
2. **Fase 2** — Paginación + filtro por defecto (último mes) en Remitos, Mantenimientos, Combustible. Toca grids pero el cambio es contenido.
3. **Fase 3** — Vista selector liviana para maquinarias/obras en combos.

## Detalles técnicos

- Los índices son `CREATE INDEX IF NOT EXISTS`, no bloquean ni rompen nada.
- El cambio de `staleTime` es seguro: las mutaciones ya invalidan las queries afectadas.
- La paginación requiere ajustar los grids para que sepan que hay "más páginas"; mantengo el comportamiento offline (cache local).
- No toco RLS, esquema, ni lógica de negocio.

## Pregunta antes de ejecutar

¿Arrancamos por **Fase 1 sola** (índices + caché, sin tocar UI, mejora medible inmediata) o vamos directo **Fases 1 + 2** (también paginación en Remitos/Mantenimientos/Combustible)?

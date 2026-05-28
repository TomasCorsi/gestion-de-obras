## Diagnóstico

Al abrir Remitos, el hook `useRemitos` ejecuta `fetchRemitosFromDB` que:
1. Pagina de a 1.000 filas hasta traer **todos** los remitos (~2.064 hoy, creciendo).
2. Cada página incluye joins a `obras`, `viajes` y `maquinarias`.
3. Recién cuando termina, React Query libera los datos y la página se pinta.

Resultado: varios segundos de "cargando" en cada entrada, aunque el usuario casi siempre trabaja con remitos recientes.

## Cambio propuesto

### 1. Fetch inicial acotado por fecha (server-side)
En `src/hooks/useRemitos.ts`:
- Por defecto traer sólo los **últimos 3 meses** (`fecha >= today - 90 días`), ordenados desc.
- Filtro aplicado en Postgres con `.gte('fecha', ...)`, no en el cliente.
- Mantiene la misma estructura de joins y la lógica `isOwnOnly` para Sergio/Franco/Calaminasur.
- Esto reduce el fetch de ~2.064 filas a unas pocas cientos → < 500 ms.

### 2. Botón "Cargar histórico completo"
- Exponer del hook un flag `loadAll` y una acción `cargarHistorico()`.
- Cuando el usuario lo activa, se dispara una segunda query con el rango completo (sin filtro de fecha) y reemplaza el dataset.
- Persistir la elección en `sessionStorage` para que dentro de la misma sesión no haya que volver a clickearlo.

### 3. Auto-extender rango si el usuario filtra por fechas anteriores
- En `Remitos.tsx`, cuando el usuario elige `fechaDesde` o `mes` anteriores al rango cargado, disparar automáticamente `cargarHistorico()` para no mostrar datos vacíos.

### 4. Realtime más quirúrgico (menor impacto, pero ya estaba en el plan original)
- Subir el debounce de invalidación de 500 ms → 1.500 ms.
- Sólo invalidar la query actualmente activa (con o sin histórico).

## Archivos a tocar

- `src/hooks/useRemitos.ts` → query acotada por fecha + acción `cargarHistorico` + realtime debounce.
- `src/pages/Remitos.tsx` → botón "Cargar histórico completo" en la barra de acciones y auto-extensión al filtrar por fechas viejas.

## Lo que **no** se cambia

- Reglas de negocio, permisos por rol, columnas, diseño, liquidaciones, importación CSV.
- Virtualización, debounce de búsqueda y lazy dialogs ya implementados (se mantienen).

## Resultado esperado

```text
Antes:                              Después:
─────────────────────────           ──────────────────────────────
Fetch ALL (3 páginas, ~2k)          Fetch últimos 90 días (1 página)
↓ ~3-5 s bloqueo inicial            ↓ < 500 ms
Render virtual                      Render virtual
                                    + botón "Cargar histórico" on-demand
```

Apertura de Remitos pasa de varios segundos a casi instantánea, sin perder acceso al histórico completo cuando se lo necesite.

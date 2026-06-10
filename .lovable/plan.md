# Plan: Acelerar la sección Certificados

## Diagnóstico (datos reales)

Tablas: 14 certificados, 76 conceptos, 120 items, 1 pago. **El volumen no es el problema.** Lo que pesa es:

1. **Cero índices** en `certificado_items`, `certificado_pagos`, `certificado_conceptos`, `certificados` (solo el `pkey`). Cada lookup por `certificado_id`, `obra_id`, `(obra_id, periodo)` hace scan secuencial.
2. **`Certificados.tsx` mide 2.794 líneas** en un solo componente. Cosas que se recalculan en cada render:
   - `etapaOrdenMap` (loop sobre conceptos) sin `useMemo`.
   - `certificadosFiltrados`, `montoTotal`, `montoCobrado`, `montoPendiente`, `pendientes`, `antiguedadProm` — todos sin `useMemo`.
   - `getPagadoByCert` recorre `allPagos` por cada certificado en cada render (N×M).
   - Cada tecla en el buscador recalcula todo.
3. **Hooks sin caché**: `useCertificados` (conceptos, certificados, allPagos) sin `staleTime`/`refetchOnMount:false` → cambiar de obra y volver re-pegado completo a la DB.
4. **`fetchAcumulados` se dispara en useEffect** cada vez que cambia `periodo` / `editingCertId`, sin caché y haciendo 2 queries seguidas.
5. **Dialog de crear/editar es monstruoso** (cientos de líneas dentro del mismo componente) → al abrirlo se re-renderiza todo el árbol.

## Cambios propuestos (3 frentes)

### 1. Índices DB (migración)

```sql
CREATE INDEX IF NOT EXISTS idx_cert_items_certificado
  ON public.certificado_items (certificado_id);
CREATE INDEX IF NOT EXISTS idx_cert_items_concepto
  ON public.certificado_items (concepto_id);

CREATE INDEX IF NOT EXISTS idx_cert_pagos_certificado_fecha
  ON public.certificado_pagos (certificado_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_cert_conceptos_obra_orden
  ON public.certificado_conceptos (obra_id, orden);

CREATE INDEX IF NOT EXISTS idx_certificados_obra_periodo
  ON public.certificados (obra_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_certificados_obra_tipo_periodo
  ON public.certificados (obra_id, tipo, periodo);
```

Esto acelera `fetchAcumulados`, `fetchItems`, `fetchPagos`, `allPagos.in(...)`, y el listado por obra.

### 2. Caché en `useCertificados`

Aplicar a las 3 queries (`certificado_conceptos`, `certificados`, `certificado_pagos`):
```ts
staleTime: 5 * 60 * 1000,
gcTime: 30 * 60 * 1000,
refetchOnMount: false,
refetchOnWindowFocus: false,
```
Las mutaciones ya invalidan, así que la consistencia se mantiene.

### 3. Memoización en `Certificados.tsx`

- `useMemo` para: `etapaOrdenMap`, `certificadosFiltrados`, KPIs (`montoTotal`, `montoCobrado`, `montoPendiente`, `pctCobranza`, `antiguedadProm`).
- **Precalcular `pagadoByCertMap`** una sola vez con `useMemo(() => allPagos.reduce(...), [allPagos])`, y reemplazar las llamadas a `getPagadoByCert(id)` por lookup `O(1)` en el Map. Hoy es `O(N×M)` en cada render.
- `useCallback` para handlers que se pasan a hijos (`getPagadoByCert`, handlers de pago).
- Debounce de 200 ms al buscador de certificados (`filtroBusqueda`) y al de conceptos (`conceptoSearch`).

No toco la estructura visual ni la lógica de negocio (PDF, pagos, anticipos, IVA, acumulados — todo igual).

## Detalles técnicos

- Los índices son `IF NOT EXISTS`, seguros, no bloquean.
- `staleTime` no cambia comportamiento: al guardar/editar siempre se invalida la query.
- La memoización no cambia resultados; solo evita recalcular en cada render. El Map de pagos es matemáticamente equivalente al `filter().reduce()` actual.
- No reescribo el componente: solo agrego `useMemo`/`useCallback` puntuales y un debounce.

## Fases

1. **Fase A** — Índices + caché. Impacto inmediato sin tocar UI.
2. **Fase B** — Memoización en `Certificados.tsx` + debounce. Suaviza tipeo, filtros y apertura de diálogos.

Avanzo directo con A + B en este mismo turno una vez aprobado, salvo que prefieras solo A primero.

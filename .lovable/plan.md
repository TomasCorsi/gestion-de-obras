
## Diagnóstico

### 1. Diálogo "CERT-XXX — Obra" tarda en cargar
En `src/pages/Certificados.tsx` → `openViewCert()` (línea 717) cada vez que abrís un certificado se disparan **3 consultas a la DB** (`fetchItems`, `fetchPagos`, `fetchAcumulados`) — no están cacheadas en React Query, son `async` simples. Aunque cierres y vuelvas a abrir el mismo certificado, vuelve a ir a la base.

Además `fetchAcumulados` se ejecuta **después** de las otras dos en vez de en paralelo, y para certificados tipo "obra"/"mixto" hace 2 queries adicionales (lista de certificados previos + suma de sus items).

### 2. Pestaña Repartidor (`/gastos` → tab Repartidor) tarda mucho
`src/hooks/useCargasRepartidorAll.ts` trae **las 2.210 cargas completas** con 5 joins anidados (operador, maquinaria, obra, parte_diario→personal, repartidor) **en cada visita**, sin `staleTime`, sin filtro de fecha, sin paginación. Es el query más caro de esa sección.

---

## Plan de cambios

### A. Caché del diálogo de certificado (`src/pages/Certificados.tsx` + `src/hooks/useCertificados.ts`)

1. Convertir `fetchItems`, `fetchPagos` y `fetchAcumulados` en **queries de React Query** keyed por `certId` (y por `obraId`+`periodo`+`excludeCertId` en el caso de acumulados), con `staleTime: 5 min`, `gcTime: 30 min`.
2. En `openViewCert`: en vez de `await Promise.all([fetchItems, fetchPagos]).then(fetchAcumulados)`, hacer **las 3 en paralelo** (`Promise.all`) porque ya no dependen entre sí.
3. Invalidar esas keys al guardar/editar/eliminar items o pagos del cert (las mutations ya existentes).

**Resultado esperado:** segunda apertura del mismo cert = instantánea; primera apertura ≈ tiempo de la query más lenta de las 3 en lugar de la suma.

### B. Filtro por defecto + caché en pestaña Repartidor

1. En `src/hooks/useCargasRepartidorAll.ts`:
   - Aceptar parámetro opcional `fechaDesde` (por defecto últimos **90 días**).
   - Agregar `staleTime: 5 min`, `gcTime: 30 min`, `refetchOnMount: false`, `refetchOnWindowFocus: false`.
   - Exponer `loadAll` + `cargarHistorico` con persistencia en `sessionStorage` (mismo patrón usado en Combustible/Mantenimiento).
2. En `src/components/gastos/CombustibleRepartidorTab.tsx`:
   - Mostrar el `<HistoricoBanner>` existente con label "entregas" y `diasMostrados={90}`.
   - Si el usuario aplica filtro de mes/año fuera de los 90 días, llamar `cargarHistorico()` automáticamente (opcional, sano).

**Resultado esperado:** la pestaña carga ~10× menos filas por defecto (las últimas 90 días) y se queda cacheada al volver.

### C. Sin cambios de DB ni de UI/negocio

Los índices de cargas_combustible_repartidor, certificado_items, certificado_pagos y certificados ya están en la base (los aplicamos en la migración anterior). No hace falta otra migración.

No se toca el render del diálogo, ni los PDF, ni la lógica de pagos/IVA/acumulados.

---

## Archivos afectados

- `src/hooks/useCertificados.ts` — convertir fetchItems/fetchPagos/fetchAcumulados a queries cacheadas (o exponerlas con `queryClient.fetchQuery` para mantener firma actual).
- `src/pages/Certificados.tsx` — `openViewCert` en paralelo, consumir nuevas queries.
- `src/hooks/useCargasRepartidorAll.ts` — `fechaDesde`, `loadAll`, opciones de caché.
- `src/components/gastos/CombustibleRepartidorTab.tsx` — `<HistoricoBanner>`.



## Plan: Persistir filtros de Parte Diario Admin en URL

### Problema identificado

Los filtros de la vista administrativa de **Parte Diario** (`/parte-diario`) se pierden cuando:
1. Cambias de pestaña/app y vuelves (React Query hace refetch con `refetchOnWindowFocus: true`)
2. Cualquier re-render del componente (los `useState` locales se reinician)

Los estados afectados en `ParteDiarioAdminView.tsx`:
- `filters` (fecha desde/hasta, obra, empleado, estado)
- `activeTab` (listado/rendimiento/faltantes)  
- `searchTerm` (búsqueda por nombre)
- `viewMode` (tabla/tarjetas)
- `currentPage` y `pageSize`

### Solución

Integrar los hooks de persistencia existentes (`useUrlState`, `useUrlTab`, `useUrlFilters`) que ya funcionan en otras páginas (Personal, Combustible, etc.) a la vista admin de Parte Diario.

### Cambios a realizar

**1. Modificar `src/components/parte-diario/ParteDiarioAdminView.tsx`**

Reemplazar los `useState` por hooks de persistencia:

```text
// ANTES (volátil)
const [filters, setFilters] = useState<ParteDiarioAdminFilters>({});
const [activeTab, setActiveTab] = useState<string>("listado");
const [searchTerm, setSearchTerm] = useState("");
const [viewMode, setViewMode] = useState<"tabla" | "tarjetas">("tabla");

// DESPUÉS (persistente en URL)
const [activeTab, setActiveTab] = useUrlTab("listado");
const [searchTerm, setSearchTerm] = useUrlSearch("");
const [viewMode, setViewMode] = useUrlState({ key: "vista", defaultValue: "tabla", serialize: v => v, deserialize: v => v as "tabla" | "tarjetas" });
const [urlFilters, setUrlFilters] = useUrlFilters({});

// Adaptar urlFilters al formato ParteDiarioAdminFilters
const filters: ParteDiarioAdminFilters = useMemo(() => ({
  fechaDesde: urlFilters.fechaDesde,
  fechaHasta: urlFilters.fechaHasta,
  obraId: urlFilters.obraId,
}), [urlFilters]);
```

**2. Extender `useUrlFilters` para soportar `estado`**

Agregar soporte para el campo `estado` en el hook existente:

```typescript
// En useUrlFilters (src/hooks/useUrlState.ts)
export interface UrlFilterState {
  fechaDesde?: string;
  fechaHasta?: string;
  mes?: string;
  year?: number;
  obraId?: string;
  estado?: string;  // NUEVO
}

// Agregar en setFilters:
if (newFilters.estado) newParams.set("estado", newFilters.estado);
```

**3. Actualizar `ParteDiarioQuickFilters.tsx`**

Asegurar que los cambios de filtros usen el setter de URL en lugar de modificar estado local.

### Resultado esperado

- Al aplicar filtros (ej: fecha "Hoy", obra "San Martín", estado "Completados"), la URL cambiará a:
  `/parte-diario?tab=listado&desde=2026-02-04&hasta=2026-02-04&obra=xxx&estado=completado`

- Al cambiar de pestaña del navegador y volver, los filtros se mantienen

- Al refrescar (F5), los filtros se restauran desde la URL

- Si la URL no tiene filtros, se recuperan de `sessionStorage` como fallback

### Archivos a modificar

1. `src/components/parte-diario/ParteDiarioAdminView.tsx` - Integrar hooks de persistencia
2. `src/hooks/useUrlState.ts` - Agregar campo `estado` a `UrlFilterState`

### Notas técnicas

- La paginación (`currentPage`) se reseteará al cambiar filtros (comportamiento esperado)
- El `pageSize` también se puede persistir si es necesario, pero tiene menor prioridad
- Los filtros de sub-componentes (`EmpleadosSinParteTab`, `ParteDiarioResumenGeneral`) podrían persistirse en una segunda iteración si es necesario


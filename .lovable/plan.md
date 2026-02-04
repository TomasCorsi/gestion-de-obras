

## Plan: Evitar recargas al cambiar de pestaña del navegador

### Problema actual

La configuración global de React Query tiene `refetchOnWindowFocus: true`, lo que significa que:
1. Cada vez que volvés a la pestaña del navegador, se disparan consultas a la base de datos
2. Esto causa un breve estado de "loading" (spinner) mientras se re-cargan los datos
3. Aunque los filtros ahora se mantienen en la URL, el efecto visual es de "recarga"

### Solución propuesta

Desactivar `refetchOnWindowFocus` globalmente y activarlo solo en casos específicos donde tenga sentido (ej: Dashboard donde querés datos actualizados al volver).

### Cambios a realizar

**1. Modificar `src/App.tsx`**

Cambiar la configuración global de React Query:

```typescript
// ANTES
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,  // Recarga SIEMPRE
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});

// DESPUÉS
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // NO recargar al volver
      staleTime: 5 * 60 * 1000,     // 5 minutos (datos "frescos" más tiempo)
      retry: 1,
      refetchOnReconnect: true,     // SÍ recargar al reconectar internet
    },
  },
});
```

**2. (Opcional) Activar refetch en páginas específicas**

Si querés que el Dashboard o ciertas páginas críticas sí recarguen al volver, se puede configurar por query individual:

```typescript
// En useDashboardData.ts o similar
const { data } = useQuery({
  queryKey: ['dashboard'],
  queryFn: fetchDashboardData,
  refetchOnWindowFocus: true,  // Solo este query recarga al volver
});
```

### Resultado esperado

- Al cambiar de pestaña y volver, la app **no recarga datos automáticamente**
- Los datos se mantienen en caché por 5 minutos (staleTime)
- Los filtros se mantienen en la URL (ya implementado)
- La experiencia es fluida sin spinners innecesarios
- Los datos se recargan si el usuario navega a otra sección y vuelve
- Si se desconecta y reconecta internet, ahí sí recarga (`refetchOnReconnect: true`)

### Trade-off

**Ventaja**: Experiencia más fluida, sin interrupciones al cambiar de pestaña
**Desventaja**: Los datos podrían estar ligeramente desactualizados si otro usuario hizo cambios mientras estabas en otra pestaña

Para mitigar esto, el usuario puede:
- Usar el botón de refrescar del navegador
- Cambiar filtros (dispara nueva consulta)
- Navegar a otra sección y volver

### Archivos a modificar

1. `src/App.tsx` - Cambiar configuración de React Query


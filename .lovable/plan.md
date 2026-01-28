
# Plan: Migración de Hooks a React Query para Sincronización Automática de Datos

## Resumen del Problema
Actualmente los hooks de datos (`useObras`, `usePersonal`, `useCombustible`, `useRemitos`, `useMaquinarias`, etc.) utilizan `useState` + `useEffect` para cargar datos. Esto causa que:

1. **Los datos quedan "atrapados" en estado local** - Cada componente tiene su propia copia de los datos
2. **No hay invalidación de caché** - Cuando un componente guarda datos, otros componentes no se enteran
3. **No hay revalidación automática** - Al volver a la app, los datos no se refrescan

## Solución Propuesta
Migrar los hooks para usar React Query (`@tanstack/react-query`), que ya está instalado pero no se está utilizando correctamente.

## Cambios a Implementar

### 1. Configurar QueryClient con Opciones Globales

**Archivo:** `src/App.tsx`

| Configuración | Valor | Propósito |
|---------------|-------|-----------|
| `refetchOnWindowFocus` | `true` | Recargar datos al volver a la app |
| `staleTime` | `30000` (30s) | Datos frescos por 30 segundos |
| `retry` | `1` | Reintentar 1 vez en caso de error |

### 2. Migrar Hooks de Lectura a useQuery

Para cada hook, se reemplaza el patrón:

```text
ANTES                              DESPUÉS
┌─────────────────────────┐        ┌─────────────────────────┐
│ useState([])            │   →    │ useQuery({              │
│ useEffect(() => {       │        │   queryKey: ['obras'],  │
│   fetch()               │        │   queryFn: fetchObras   │
│ }, [])                  │        │ })                      │
└─────────────────────────┘        └─────────────────────────┘
```

### 3. Migrar Funciones de Mutación a useMutation

Las funciones `create`, `update`, `delete` usarán `useMutation` con invalidación automática:

```text
┌────────────────────────────────────────────────────────┐
│ useMutation({                                          │
│   mutationFn: (data) => supabase.insert(data),        │
│   onSuccess: () => {                                   │
│     queryClient.invalidateQueries(['obras'])  ← CLAVE │
│   }                                                    │
│ })                                                     │
└────────────────────────────────────────────────────────┘
```

### 4. Hooks a Migrar (Orden de Prioridad)

| # | Hook | Query Key | Impacto |
|---|------|-----------|---------|
| 1 | `useObras.ts` | `['obras']` | Alto - Base de todo |
| 2 | `usePersonal.ts` | `['personal']` | Alto - Relaciones |
| 3 | `useMaquinarias.ts` | `['maquinarias']` | Alto - Relaciones |
| 4 | `useCombustible.ts` | `['combustible']` | Medio - Grid |
| 5 | `useRemitos.ts` | `['remitos']` | Medio - Grid |
| 6 | `useViajes.ts` | `['viajes']` | Medio |
| 7 | `useDashboardData.ts` | `['dashboard']` | Bajo - Compuesto |
| 8 | `useMantenimientos.ts` | `['mantenimientos']` | Bajo |
| 9 | `useOtrosGastos.ts` | `['otros-gastos']` | Bajo |
| 10 | `usePresentismo.ts` | `['presentismo']` | Bajo |
| 11 | `useHorasMaquina.ts` | `['horas-maquina']` | Bajo |

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/App.tsx` | Configurar QueryClient con opciones globales |
| `src/hooks/useObras.ts` | Migrar a useQuery + useMutation |
| `src/hooks/usePersonal.ts` | Migrar a useQuery + useMutation |
| `src/hooks/useMaquinarias.ts` | Migrar a useQuery + useMutation |
| `src/hooks/useCombustible.ts` | Migrar a useQuery + useMutation |
| `src/hooks/useRemitos.ts` | Migrar a useQuery + useMutation |
| `src/hooks/useViajes.ts` | Migrar a useQuery + useMutation |
| `src/hooks/useDashboardData.ts` | Migrar a useQuery |
| `src/hooks/useMantenimientos.ts` | Migrar a useQuery + useMutation |
| `src/hooks/useOtrosGastos.ts` | Migrar a useQuery + useMutation |
| `src/hooks/usePresentismo.ts` | Migrar a useQuery + useMutation |
| `src/hooks/useHorasMaquina.ts` | Migrar a useQuery |

## Sección Técnica

### Configuración del QueryClient

```typescript
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,  // Recargar al volver a la app
      staleTime: 30 * 1000,        // 30 segundos de datos frescos
      retry: 1,                    // 1 reintento en errores
      refetchOnReconnect: true,    // Recargar al reconectar internet
    },
  },
});
```

### Ejemplo de Hook Migrado (useObras)

```typescript
// src/hooks/useObras.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Función de fetch separada
const fetchObras = async (): Promise<ObraWithRelations[]> => {
  const { data, error } = await supabase
    .from("obras")
    .select(`*, responsable:personal(nombre, apellido)`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export function useObras() {
  const queryClient = useQueryClient();

  // Query para leer datos
  const { 
    data: obras = [], 
    isLoading: loading,
    refetch: fetchObras 
  } = useQuery({
    queryKey: ['obras'],
    queryFn: fetchObras,
  });

  // Mutación para crear
  const createMutation = useMutation({
    mutationFn: async (obra: ObraForm) => {
      const { data, error } = await supabase
        .from("obras")
        .insert([...])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Obra creada correctamente");
      // CLAVE: Invalidar caché para que todos los componentes se actualicen
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
    onError: () => {
      toast.error("Error al crear obra");
    },
  });

  // Mutación para actualizar
  const updateMutation = useMutation({
    mutationFn: async ({ id, obra }: { id: string; obra: Partial<ObraForm> }) => {
      const { error } = await supabase
        .from("obras")
        .update(obra)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      // También invalidar dashboard si lo usa
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast.error("Error al actualizar obra");
    },
  });

  // Mutación para eliminar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("obras")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra eliminada correctamente");
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
    onError: () => {
      toast.error("Error al eliminar obra");
    },
  });

  // Mantener la misma interfaz para compatibilidad
  return {
    obras,
    loading,
    fetchObras,
    createObra: (obra: ObraForm) => createMutation.mutateAsync(obra),
    updateObra: async (id: string, obra: Partial<ObraForm>) => {
      try {
        await updateMutation.mutateAsync({ id, obra });
        return true;
      } catch {
        return false;
      }
    },
    deleteObra: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}
```

### Invalidación Cruzada (Dashboard)

Cuando se modifica una obra, también se debe invalidar el dashboard:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['obras'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
},
```

## Beneficios Esperados

1. **Datos siempre sincronizados** - Al crear/editar/eliminar, todos los componentes ven los cambios inmediatamente
2. **Actualización al volver a la app** - Los datos se refrescan automáticamente al cambiar de pestaña o volver del background
3. **Caché inteligente** - Evita peticiones innecesarias si los datos son recientes
4. **Reconexión automática** - Al recuperar conexión a internet, los datos se recargan
5. **Mejor experiencia móvil** - Crítico para la PWA en campo con conectividad variable

## Pruebas Recomendadas

1. Crear una obra en un componente y verificar que aparece en otro componente sin recargar
2. Minimizar la app, esperar unos segundos, y volver para ver que los datos se refrescan
3. Editar datos en la grilla de combustible y verificar que el dashboard se actualiza
4. Probar en el celular: cargar datos, cerrar la app, abrir de nuevo y verificar datos actualizados

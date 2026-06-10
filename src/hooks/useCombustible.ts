import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_DAYS_BACK = 90;
const LOAD_ALL_SESSION_KEY = "combustible:loadAll";

export interface CargaCombustibleDB {
  id: string;
  fecha: string;
  obra_id: string;
  maquinaria_id: string;
  litros: number;
  precio_litro: number;
  costo_total: number;
  horas_maquina: number;
  estacion: string;
  operador: string;
  comprobante: string | null;
  created_at: string;
  updated_at: string;
}

export interface CargaCombustibleWithRelations extends CargaCombustibleDB {
  obra?: { nombre: string };
  maquinaria?: { nombre: string; codigo: string };
}

export interface CargaCombustibleForm {
  fecha?: string;
  obra_id?: string;
  maquinaria_id?: string;
  litros?: number;
  precio_litro?: number;
  costo_total?: number;
  horas_maquina?: number;
  estacion?: string;
  operador?: string;
  comprobante?: string;
}

const fetchCargasFromDB = async (fechaDesde: string | null): Promise<CargaCombustibleWithRelations[]> => {
  let query = supabase
    .from("cargas_combustible")
    .select(`
      *,
      obra:obras(nombre),
      maquinaria:maquinarias(nombre, codigo)
    `)
    .order("fecha", { ascending: false });

  if (fechaDesde) {
    query = query.gte("fecha", fechaDesde);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export function useCombustible() {
  const queryClient = useQueryClient();

  const [loadAll, setLoadAll] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(LOAD_ALL_SESSION_KEY) === "1";
  });
  const cargarHistorico = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(LOAD_ALL_SESSION_KEY, "1");
    }
    setLoadAll(true);
  }, []);

  const fechaDesde = useMemo(() => {
    if (loadAll) return null;
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS_BACK);
    return d.toISOString().slice(0, 10);
  }, [loadAll]);

  const { 
    data: cargas = [], 
    isLoading: loading,
    refetch: fetchCargas 
  } = useQuery({
    queryKey: ['combustible', fechaDesde],
    queryFn: () => fetchCargasFromDB(fechaDesde),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });


  const createMutation = useMutation({
    mutationFn: async (carga: CargaCombustibleForm) => {
      const { data, error } = await supabase
        .from("cargas_combustible")
        .insert([carga])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Carga registrada correctamente");
      queryClient.invalidateQueries({ queryKey: ['combustible'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating carga:", error);
      toast.error("Error al registrar carga");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, carga }: { id: string; carga: Partial<CargaCombustibleForm> }) => {
      const { error } = await supabase
        .from("cargas_combustible")
        .update(carga)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carga actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ['combustible'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating carga:", error);
      toast.error("Error al actualizar carga");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cargas_combustible")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carga eliminada correctamente");
      queryClient.invalidateQueries({ queryKey: ['combustible'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting carga:", error);
      toast.error("Error al eliminar carga");
    },
  });

  const batchSaveMutation = useMutation({
    mutationFn: async (changes: {
      created: CargaCombustibleForm[];
      updated: { id: string; data: Partial<CargaCombustibleForm> }[];
      deleted: string[];
    }) => {
      const results = { created: 0, updated: 0, deleted: 0, errors: 0 };
      const promises: Promise<void>[] = [];

      // Batch insert (single call)
      if (changes.created.length > 0) {
        const insertPromise = (async () => {
          const { error } = await supabase
            .from("cargas_combustible")
            .insert(changes.created);
          if (error) {
            console.error("Error batch insert:", error);
            results.errors++;
          } else {
            results.created = changes.created.length;
          }
        })();
        promises.push(insertPromise);
      }

      // Parallel updates
      for (const { id, data } of changes.updated) {
        const updatePromise = (async () => {
          const { error } = await supabase
            .from("cargas_combustible")
            .update(data)
            .eq("id", id);
          if (error) {
            console.error("Error updating:", error);
            results.errors++;
          } else {
            results.updated++;
          }
        })();
        promises.push(updatePromise);
      }

      // Batch delete (single call with array of IDs)
      if (changes.deleted.length > 0) {
        const deletePromise = (async () => {
          const { error } = await supabase
            .from("cargas_combustible")
            .delete()
            .in("id", changes.deleted);
          if (error) {
            console.error("Error batch delete:", error);
            results.errors++;
          } else {
            results.deleted = changes.deleted.length;
          }
        })();
        promises.push(deletePromise);
      }

      await Promise.all(promises);
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combustible'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error in batch save:", error);
    },
  });

  return {
    cargas,
    loading,
    fetchCargas,
    loadAll,
    cargarHistorico,
    createCarga: async (carga: CargaCombustibleForm) => {
      try {
        return await createMutation.mutateAsync(carga);
      } catch {
        return null;
      }
    },
    updateCarga: async (id: string, carga: Partial<CargaCombustibleForm>) => {
      try {
        await updateMutation.mutateAsync({ id, carga });
        return true;
      } catch {
        return false;
      }
    },
    deleteCarga: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    batchSave: async (changes: {
      created: CargaCombustibleForm[];
      updated: { id: string; data: Partial<CargaCombustibleForm> }[];
      deleted: string[];
    }) => {
      return await batchSaveMutation.mutateAsync(changes);
    },
  };
}

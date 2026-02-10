import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RemitoDB {
  id: string;
  numero: string;
  viaje_id: string | null;
  fecha: string;
  obra_id: string;
  material: string;
  cantidad: number;
  unidad: string;
  recibido_por: string;
  firmado: boolean;
  evidencia_url: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  row_color: string | null;
  // New columns
  remito_tercero: string | null;
  remito_local: string | null;
  desde: string | null;
  hasta: string | null;
  cantidad_viajes: number;
  tipo_material: string | null;
  precio_total: number;
  tipo_transporte: string | null;
  maquinaria_id: string | null;
  patente_tercero: string | null;
}

export interface RemitoWithRelations extends RemitoDB {
  obra?: { nombre: string };
  viaje?: { origen: string; destino: string };
  maquinaria?: { codigo: string; patente: string | null };
}

export interface RemitoForm {
  numero: string;
  viaje_id?: string;
  fecha: string;
  obra_id: string;
  material: string;
  cantidad: number;
  unidad: string;
  recibido_por: string;
  firmado: boolean;
  evidencia_url?: string;
  observaciones?: string;
  // New fields
  remito_tercero?: string;
  remito_local?: string;
  desde?: string;
  hasta?: string;
  cantidad_viajes?: number;
  tipo_material?: string;
  precio_total?: number;
  tipo_transporte?: string;
  maquinaria_id?: string;
  patente_tercero?: string;
  row_color?: string | null;
}

const fetchRemitosFromDB = async (): Promise<RemitoWithRelations[]> => {
  const { data, error } = await supabase
    .from("remitos")
    .select(`
      *,
      obra:obras(nombre),
      viaje:viajes(origen, destino),
      maquinaria:maquinarias(codigo, patente)
    `)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data || [];
};

export function useRemitos() {
  const queryClient = useQueryClient();

  const { 
    data: remitos = [], 
    isLoading: loading,
    refetch: fetchRemitos 
  } = useQuery({
    queryKey: ['remitos'],
    queryFn: fetchRemitosFromDB,
  });

  const createMutation = useMutation({
    mutationFn: async (remito: RemitoForm) => {
      const { data, error } = await supabase
        .from("remitos")
        .insert([remito])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Remito creado correctamente");
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating remito:", error);
      toast.error("Error al crear remito");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, remito }: { id: string; remito: Partial<RemitoForm> }) => {
      const { error } = await supabase
        .from("remitos")
        .update(remito)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Remito actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating remito:", error);
      toast.error("Error al actualizar remito");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("remitos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Remito eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting remito:", error);
      toast.error("Error al eliminar remito");
    },
  });

  const batchSaveMutation = useMutation({
    mutationFn: async (changes: {
      created: RemitoForm[];
      updated: { id: string; data: Partial<RemitoForm> }[];
      deleted: string[];
    }) => {
      const results = { created: 0, updated: 0, deleted: 0, errors: 0 };
      const promises: Promise<void>[] = [];

      // Batch insert (single call)
      if (changes.created.length > 0) {
        const insertPromise = (async () => {
          const { error } = await supabase
            .from("remitos")
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
            .from("remitos")
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
            .from("remitos")
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
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error in batch save:", error);
    },
  });

  return {
    remitos,
    loading,
    fetchRemitos,
    createRemito: async (remito: RemitoForm) => {
      try {
        return await createMutation.mutateAsync(remito);
      } catch {
        return null;
      }
    },
    updateRemito: async (id: string, remito: Partial<RemitoForm>) => {
      try {
        await updateMutation.mutateAsync({ id, remito });
        return true;
      } catch {
        return false;
      }
    },
    deleteRemito: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    batchSave: async (changes: {
      created: RemitoForm[];
      updated: { id: string; data: Partial<RemitoForm> }[];
      deleted: string[];
    }) => {
      return await batchSaveMutation.mutateAsync(changes);
    },
    updateRowColor: async (id: string, color: string | null) => {
      const { error } = await supabase
        .from("remitos")
        .update({ row_color: color } as Record<string, unknown>)
        .eq("id", id);
      if (error) {
        console.error("Error updating row color:", error);
        toast.error("Error al cambiar color");
        return false;
      }
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      return true;
    },
  };
}

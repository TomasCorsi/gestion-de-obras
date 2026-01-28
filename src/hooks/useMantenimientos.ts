import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoMantenimiento = "preventivo" | "correctivo" | "emergencia";
export type EstadoMantenimiento = "programado" | "en_proceso" | "completado";

export interface MantenimientoDB {
  id: string;
  fecha: string;
  maquinaria_id: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  repuestos: string | null;
  costo_repuestos: number;
  costo_mano_obra: number;
  costo_total: number;
  horas_maquina: number;
  tecnico: string;
  estado: EstadoMantenimiento;
  proximo_mantenimiento: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface MantenimientoWithRelations extends MantenimientoDB {
  maquinaria?: { nombre: string; codigo: string };
}

export interface MantenimientoForm {
  fecha: string;
  maquinaria_id: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  repuestos?: string;
  costo_repuestos: number;
  costo_mano_obra: number;
  costo_total: number;
  horas_maquina: number;
  tecnico: string;
  estado: EstadoMantenimiento;
  proximo_mantenimiento?: string;
  observaciones?: string;
}

const fetchMantenimientosFromDB = async (): Promise<MantenimientoWithRelations[]> => {
  const { data, error } = await supabase
    .from("mantenimientos")
    .select(`
      *,
      maquinaria:maquinarias(nombre, codigo)
    `)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data || [];
};

export function useMantenimientos() {
  const queryClient = useQueryClient();

  const { 
    data: mantenimientos = [], 
    isLoading: loading,
    refetch: fetchMantenimientos 
  } = useQuery({
    queryKey: ['mantenimientos'],
    queryFn: fetchMantenimientosFromDB,
  });

  const createMutation = useMutation({
    mutationFn: async (mant: MantenimientoForm) => {
      const { data, error } = await supabase
        .from("mantenimientos")
        .insert([mant])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Mantenimiento creado correctamente");
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating mantenimiento:", error);
      toast.error("Error al crear mantenimiento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, mant }: { id: string; mant: Partial<MantenimientoForm> }) => {
      const { error } = await supabase
        .from("mantenimientos")
        .update(mant)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mantenimiento actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating mantenimiento:", error);
      toast.error("Error al actualizar mantenimiento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mantenimientos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mantenimiento eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting mantenimiento:", error);
      toast.error("Error al eliminar mantenimiento");
    },
  });

  return {
    mantenimientos,
    loading,
    fetchMantenimientos,
    createMantenimiento: async (mant: MantenimientoForm) => {
      try {
        return await createMutation.mutateAsync(mant);
      } catch {
        return null;
      }
    },
    updateMantenimiento: async (id: string, mant: Partial<MantenimientoForm>) => {
      try {
        await updateMutation.mutateAsync({ id, mant });
        return true;
      } catch {
        return false;
      }
    },
    deleteMantenimiento: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}

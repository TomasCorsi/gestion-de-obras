import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChecklistCambio, ChecklistChequeo } from "@/components/mantenimiento/mantenimientoConstants";

export type TipoMantenimiento = "preventivo" | "correctivo" | "emergencia";
export type EstadoMantenimiento = "pendiente" | "en_proceso" | "completado";

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
  kilometros: number;
  tecnico: string;
  tecnico_id: string | null;
  estado: EstadoMantenimiento;
  proximo_mantenimiento: string | null;
  proximo_service_km: number | null;
  proximo_service_hr: number | null;
  informe_tecnico: string | null;
  alerta_campo: string | null;
  checklist_cambio: ChecklistCambio | null;
  checklist_chequeo: ChecklistChequeo | null;
  adjunto_url: string | null;
  observaciones: string | null;
  observacion_reporte_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MantenimientoWithRelations extends MantenimientoDB {
  maquinaria?: { nombre: string; codigo: string; horas_acumuladas?: number };
  tecnico_personal?: { nombre: string | null; apellido: string | null } | null;
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
  kilometros?: number;
  tecnico: string;
  tecnico_id?: string;
  estado: EstadoMantenimiento;
  proximo_mantenimiento?: string;
  proximo_service_km?: number;
  proximo_service_hr?: number;
  informe_tecnico?: string;
  alerta_campo?: string;
  checklist_cambio?: ChecklistCambio;
  checklist_chequeo?: ChecklistChequeo;
  adjunto_url?: string;
  observaciones?: string;
  observacion_reporte_id?: string;
}

const fetchMantenimientosFromDB = async (): Promise<MantenimientoWithRelations[]> => {
  const { data, error } = await supabase
    .from("mantenimientos")
    .select(`
      *,
      maquinaria:maquinarias(nombre, codigo, horas_acumuladas),
      tecnico_personal:personal!mantenimientos_tecnico_id_fkey(nombre, apellido)
    `)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as MantenimientoWithRelations[];
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
      const payload: any = { ...mant };
      if (payload.checklist_cambio) payload.checklist_cambio = payload.checklist_cambio;
      if (payload.checklist_chequeo) payload.checklist_chequeo = payload.checklist_chequeo;

      const { data, error } = await supabase
        .from("mantenimientos")
        .insert([payload])
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
        .update(mant as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mantenimiento actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['observaciones_maquina'] });
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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoVacacion = "pendiente" | "aprobada" | "rechazada";
export type MotivoVacacion = "vacaciones" | "licencia_medica" | "permiso_personal" | "otro";

export interface VacacionDB {
  id: string;
  personal_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  motivo: string;
  estado: EstadoVacacion;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  personal?: {
    nombre: string | null;
    apellido: string | null;
  };
}

export interface VacacionForm {
  personal_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  motivo: string;
  observaciones?: string;
}

export function useVacaciones() {
  const [vacaciones, setVacaciones] = useState<VacacionDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVacaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vacaciones")
      .select(`
        *,
        personal:personal_id (
          nombre,
          apellido
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vacaciones:", error);
      toast.error("Error al cargar vacaciones");
    } else {
      setVacaciones((data as unknown as VacacionDB[]) || []);
    }
    setLoading(false);
  };

  const createVacacion = async (vacacion: VacacionForm) => {
    const { data, error } = await supabase
      .from("vacaciones")
      .insert([vacacion])
      .select()
      .single();

    if (error) {
      console.error("Error creating vacacion:", error);
      toast.error("Error al crear solicitud de vacaciones");
      return null;
    }

    toast.success("Solicitud de vacaciones creada correctamente");
    await fetchVacaciones();
    return data;
  };

  const updateVacacion = async (id: string, vacacion: Partial<VacacionForm>) => {
    const { error } = await supabase
      .from("vacaciones")
      .update(vacacion)
      .eq("id", id);

    if (error) {
      console.error("Error updating vacacion:", error);
      toast.error("Error al actualizar vacaciones");
      return false;
    }

    toast.success("Vacaciones actualizadas correctamente");
    await fetchVacaciones();
    return true;
  };

  const deleteVacacion = async (id: string) => {
    const { error } = await supabase
      .from("vacaciones")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting vacacion:", error);
      toast.error("Error al eliminar vacaciones");
      return false;
    }

    toast.success("Vacaciones eliminadas correctamente");
    await fetchVacaciones();
    return true;
  };

  const aprobarVacacion = async (id: string, aprobadoPorId?: string) => {
    const { error } = await supabase
      .from("vacaciones")
      .update({
        estado: "aprobada",
        aprobado_por: aprobadoPorId || null,
        fecha_aprobacion: new Date().toISOString().split("T")[0],
      })
      .eq("id", id);

    if (error) {
      console.error("Error approving vacacion:", error);
      toast.error("Error al aprobar vacaciones");
      return false;
    }

    toast.success("Vacaciones aprobadas correctamente");
    await fetchVacaciones();
    return true;
  };

  const rechazarVacacion = async (id: string, aprobadoPorId?: string) => {
    const { error } = await supabase
      .from("vacaciones")
      .update({
        estado: "rechazada",
        aprobado_por: aprobadoPorId || null,
        fecha_aprobacion: new Date().toISOString().split("T")[0],
      })
      .eq("id", id);

    if (error) {
      console.error("Error rejecting vacacion:", error);
      toast.error("Error al rechazar vacaciones");
      return false;
    }

    toast.success("Vacaciones rechazadas");
    await fetchVacaciones();
    return true;
  };

  useEffect(() => {
    fetchVacaciones();
  }, []);

  return {
    vacaciones,
    loading,
    fetchVacaciones,
    createVacacion,
    updateVacacion,
    deleteVacacion,
    aprobarVacacion,
    rechazarVacacion,
  };
}

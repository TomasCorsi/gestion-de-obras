import { useState, useEffect } from "react";
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

export function useMantenimientos() {
  const [mantenimientos, setMantenimientos] = useState<MantenimientoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMantenimientos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mantenimientos")
      .select(`
        *,
        maquinaria:maquinarias(nombre, codigo)
      `)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error fetching mantenimientos:", error);
      toast.error("Error al cargar mantenimientos");
    } else {
      setMantenimientos(data || []);
    }
    setLoading(false);
  };

  const createMantenimiento = async (mant: MantenimientoForm) => {
    const { data, error } = await supabase
      .from("mantenimientos")
      .insert([mant])
      .select()
      .single();

    if (error) {
      console.error("Error creating mantenimiento:", error);
      toast.error("Error al crear mantenimiento");
      return null;
    }

    toast.success("Mantenimiento creado correctamente");
    await fetchMantenimientos();
    return data;
  };

  const updateMantenimiento = async (id: string, mant: Partial<MantenimientoForm>) => {
    const { error } = await supabase
      .from("mantenimientos")
      .update(mant)
      .eq("id", id);

    if (error) {
      console.error("Error updating mantenimiento:", error);
      toast.error("Error al actualizar mantenimiento");
      return false;
    }

    toast.success("Mantenimiento actualizado correctamente");
    await fetchMantenimientos();
    return true;
  };

  const deleteMantenimiento = async (id: string) => {
    const { error } = await supabase
      .from("mantenimientos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting mantenimiento:", error);
      toast.error("Error al eliminar mantenimiento");
      return false;
    }

    toast.success("Mantenimiento eliminado correctamente");
    await fetchMantenimientos();
    return true;
  };

  useEffect(() => {
    fetchMantenimientos();
  }, []);

  return {
    mantenimientos,
    loading,
    fetchMantenimientos,
    createMantenimiento,
    updateMantenimiento,
    deleteMantenimiento,
  };
}

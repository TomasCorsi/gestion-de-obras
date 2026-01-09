import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoMaquinaria = "excavadora" | "cargadora" | "camion_articulado" | "topadora" | "rodillo" | "retroexcavadora" | "motoniveladora";
export type EstadoMaquinaria = "operativa" | "mantenimiento" | "inactiva" | "en_uso";

export interface MaquinariaDB {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoMaquinaria;
  marca: string;
  modelo: string;
  anio: number;
  patente: string | null;
  estado: EstadoMaquinaria;
  ubicacion_actual: string;
  horas_acumuladas: number;
  proximo_service: number;
  operador_asignado_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaquinariaForm {
  codigo: string;
  nombre: string;
  tipo: TipoMaquinaria;
  marca: string;
  modelo: string;
  anio: number;
  patente?: string;
  estado: EstadoMaquinaria;
  ubicacion_actual: string;
  horas_acumuladas: number;
  proximo_service: number;
  operador_asignado_id?: string;
}

export function useMaquinarias() {
  const [maquinarias, setMaquinarias] = useState<MaquinariaDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaquinarias = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("maquinarias")
      .select("*")
      .order("nombre");

    if (error) {
      console.error("Error fetching maquinarias:", error);
      toast.error("Error al cargar maquinarias");
    } else {
      setMaquinarias(data || []);
    }
    setLoading(false);
  };

  const createMaquinaria = async (maq: MaquinariaForm) => {
    const { data, error } = await supabase
      .from("maquinarias")
      .insert([maq])
      .select()
      .single();

    if (error) {
      console.error("Error creating maquinaria:", error);
      toast.error("Error al crear maquinaria");
      return null;
    }

    toast.success("Maquinaria creada correctamente");
    await fetchMaquinarias();
    return data;
  };

  const updateMaquinaria = async (id: string, maq: Partial<MaquinariaForm>) => {
    const { error } = await supabase
      .from("maquinarias")
      .update(maq)
      .eq("id", id);

    if (error) {
      console.error("Error updating maquinaria:", error);
      toast.error("Error al actualizar maquinaria");
      return false;
    }

    toast.success("Maquinaria actualizada correctamente");
    await fetchMaquinarias();
    return true;
  };

  const deleteMaquinaria = async (id: string) => {
    const { error } = await supabase
      .from("maquinarias")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting maquinaria:", error);
      toast.error("Error al eliminar maquinaria");
      return false;
    }

    toast.success("Maquinaria eliminada correctamente");
    await fetchMaquinarias();
    return true;
  };

  useEffect(() => {
    fetchMaquinarias();
  }, []);

  return {
    maquinarias,
    loading,
    fetchMaquinarias,
    createMaquinaria,
    updateMaquinaria,
    deleteMaquinaria,
  };
}

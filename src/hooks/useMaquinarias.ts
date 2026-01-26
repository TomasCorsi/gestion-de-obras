import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoMaquinaria = 
  | "cargadora"
  | "compactador"
  | "retroexcavadora"
  | "minicargadora"
  | "motoniveladora"
  | "topador"
  | "pala_retro"
  | "batea"
  | "acoplado"
  | "camion"
  | "carreton"
  | "cisterna"
  | "tanque_cisterna"
  | "tanque_regador_tractor"
  | "soplador"
  | "zanjeadora"
  | "rastra"
  | "tractor"
  | "rastra_grosspal"
  | "auto"
  | "camioneta"
  | "grupo_electrogeno";
export type EstadoMaquinaria = "operativa" | "mantenimiento" | "inactiva" | "en_uso";

export interface MaquinariaDB {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoMaquinaria;
  marca: string;
  anio: number;
  patente: string | null;
  estado: EstadoMaquinaria;
  horas_acumuladas: number;
  operador_asignado_id: string | null;
  obra_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaquinariaWithRelations extends MaquinariaDB {
  operador?: { nombre: string; apellido: string } | null;
  obra?: { nombre: string } | null;
}

export interface MaquinariaForm {
  codigo?: string;
  nombre?: string;
  tipo?: TipoMaquinaria;
  marca?: string;
  anio?: number;
  patente?: string;
  estado?: EstadoMaquinaria;
  horas_acumuladas?: number;
  operador_asignado_id?: string;
  obra_id?: string;
}

export function useMaquinarias() {
  const [maquinarias, setMaquinarias] = useState<MaquinariaWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaquinarias = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("maquinarias")
      .select(`
        *,
        operador:personal!operador_asignado_id(nombre, apellido),
        obra:obras(nombre)
      `)
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
    const insertData = {
      codigo: maq.codigo || null,
      nombre: maq.nombre || null,
      tipo: maq.tipo || "cargadora",
      marca: maq.marca || null,
      anio: maq.anio || null,
      patente: maq.patente || null,
      estado: maq.estado || "operativa",
      horas_acumuladas: maq.horas_acumuladas || 0,
      operador_asignado_id: maq.operador_asignado_id || null,
      obra_id: maq.obra_id || null,
    };

    const { data, error } = await supabase
      .from("maquinarias")
      .insert([insertData])
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
    const updateData: any = { ...maq };
    if (maq.patente === "") updateData.patente = null;
    if (maq.operador_asignado_id === undefined) updateData.operador_asignado_id = null;
    if (maq.obra_id === undefined) updateData.obra_id = null;

    const { error } = await supabase
      .from("maquinarias")
      .update(updateData)
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

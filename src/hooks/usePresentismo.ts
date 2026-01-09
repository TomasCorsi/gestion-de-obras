import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoPresentismo = "presente" | "ausente" | "licencia" | "vacaciones" | "enfermedad";

export interface RegistroHHDB {
  id: string;
  fecha: string;
  persona_id: string;
  obra_id: string;
  capataz_id: string;
  hora_entrada: string;
  hora_salida: string;
  horas_normales: number;
  horas_extra: number;
  horas_totales: number;
  tarea: string;
  estado: EstadoPresentismo;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistroHHWithRelations extends RegistroHHDB {
  persona?: { nombre: string; apellido: string };
  obra?: { nombre: string };
  capataz?: { nombre: string; apellido: string };
}

export interface RegistroHHForm {
  fecha: string;
  persona_id: string;
  obra_id: string;
  capataz_id: string;
  hora_entrada: string;
  hora_salida: string;
  horas_normales: number;
  horas_extra: number;
  horas_totales: number;
  tarea: string;
  estado: EstadoPresentismo;
  observaciones?: string;
}

export function usePresentismo() {
  const [registros, setRegistros] = useState<RegistroHHWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistros = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("registros_hh")
      .select(`
        *,
        persona:personal!registros_hh_persona_id_fkey(nombre, apellido),
        obra:obras(nombre),
        capataz:personal!registros_hh_capataz_id_fkey(nombre, apellido)
      `)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error fetching registros:", error);
      toast.error("Error al cargar registros");
    } else {
      setRegistros(data || []);
    }
    setLoading(false);
  };

  const createRegistro = async (registro: RegistroHHForm) => {
    const { data, error } = await supabase
      .from("registros_hh")
      .insert([registro])
      .select()
      .single();

    if (error) {
      console.error("Error creating registro:", error);
      toast.error("Error al crear registro");
      return null;
    }

    toast.success("Registro creado correctamente");
    await fetchRegistros();
    return data;
  };

  const updateRegistro = async (id: string, registro: Partial<RegistroHHForm>) => {
    const { error } = await supabase
      .from("registros_hh")
      .update(registro)
      .eq("id", id);

    if (error) {
      console.error("Error updating registro:", error);
      toast.error("Error al actualizar registro");
      return false;
    }

    toast.success("Registro actualizado correctamente");
    await fetchRegistros();
    return true;
  };

  const deleteRegistro = async (id: string) => {
    const { error } = await supabase
      .from("registros_hh")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting registro:", error);
      toast.error("Error al eliminar registro");
      return false;
    }

    toast.success("Registro eliminado correctamente");
    await fetchRegistros();
    return true;
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  return {
    registros,
    loading,
    fetchRegistros,
    createRegistro,
    updateRegistro,
    deleteRegistro,
  };
}

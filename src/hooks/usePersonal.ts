import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RolPersonal = "capataz" | "maquinista" | "chofer" | "administrativo" | "ayudante" | "sereno";

export interface PersonalDB {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  rol: RolPersonal;
  email: string | null;
  telefono: string;
  fecha_ingreso: string;
  activo: boolean;
  licencia: string | null;
  vencimiento_licencia: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalForm {
  nombre: string;
  apellido: string;
  dni: string;
  rol: RolPersonal;
  email?: string;
  telefono: string;
  fecha_ingreso: string;
  activo: boolean;
  licencia?: string;
  vencimiento_licencia?: string;
}

export function usePersonal() {
  const [personal, setPersonal] = useState<PersonalDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPersonal = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("personal")
      .select("*")
      .order("apellido");

    if (error) {
      console.error("Error fetching personal:", error);
      toast.error("Error al cargar personal");
    } else {
      setPersonal(data || []);
    }
    setLoading(false);
  };

  const createPersonal = async (persona: PersonalForm) => {
    const { data, error } = await supabase
      .from("personal")
      .insert([persona])
      .select()
      .single();

    if (error) {
      console.error("Error creating personal:", error);
      toast.error("Error al crear personal");
      return null;
    }

    toast.success("Personal creado correctamente");
    await fetchPersonal();
    return data;
  };

  const updatePersonal = async (id: string, persona: Partial<PersonalForm>) => {
    const { error } = await supabase
      .from("personal")
      .update(persona)
      .eq("id", id);

    if (error) {
      console.error("Error updating personal:", error);
      toast.error("Error al actualizar personal");
      return false;
    }

    toast.success("Personal actualizado correctamente");
    await fetchPersonal();
    return true;
  };

  const deletePersonal = async (id: string) => {
    const { error } = await supabase
      .from("personal")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting personal:", error);
      toast.error("Error al eliminar personal");
      return false;
    }

    toast.success("Personal eliminado correctamente");
    await fetchPersonal();
    return true;
  };

  useEffect(() => {
    fetchPersonal();
  }, []);

  return {
    personal,
    loading,
    fetchPersonal,
    createPersonal,
    updatePersonal,
    deletePersonal,
  };
}

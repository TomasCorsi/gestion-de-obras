import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoObra = "activa" | "pendiente" | "finalizada" | "pausada";

export interface ObraDB {
  id: string;
  nombre: string;
  ubicacion: string | null;
  descripcion: string | null;
  estado: EstadoObra;
  fecha_inicio: string | null;
  fecha_fin_estimada: string | null;
  responsable_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObraWithRelations extends ObraDB {
  responsable?: { nombre: string; apellido: string };
}

export interface ObraForm {
  nombre: string;
  ubicacion?: string;
  descripcion?: string;
  estado: EstadoObra;
  fecha_inicio?: string;
  fecha_fin_estimada?: string;
  responsable_id?: string;
}

export function useObras() {
  const [obras, setObras] = useState<ObraWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchObras = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("obras")
      .select(`
        *,
        responsable:personal(nombre, apellido)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching obras:", error);
      toast.error("Error al cargar obras");
    } else {
      setObras(data || []);
    }
    setLoading(false);
  };

  const createObra = async (obra: ObraForm) => {
    const insertData = {
      nombre: obra.nombre,
      estado: obra.estado,
      ubicacion: obra.ubicacion || null,
      descripcion: obra.descripcion || null,
      fecha_inicio: obra.fecha_inicio || null,
      fecha_fin_estimada: obra.fecha_fin_estimada || null,
      responsable_id: obra.responsable_id || null,
    };

    const { data, error } = await supabase
      .from("obras")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Error creating obra:", error);
      toast.error("Error al crear obra");
      return null;
    }

    toast.success("Obra creada correctamente");
    await fetchObras();
    return data;
  };

  const updateObra = async (id: string, obra: Partial<ObraForm>) => {
    const { error } = await supabase
      .from("obras")
      .update(obra)
      .eq("id", id);

    if (error) {
      console.error("Error updating obra:", error);
      toast.error("Error al actualizar obra");
      return false;
    }

    toast.success("Obra actualizada correctamente");
    await fetchObras();
    return true;
  };

  const deleteObra = async (id: string) => {
    const { error } = await supabase
      .from("obras")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting obra:", error);
      toast.error("Error al eliminar obra");
      return false;
    }

    toast.success("Obra eliminada correctamente");
    await fetchObras();
    return true;
  };

  useEffect(() => {
    fetchObras();
  }, []);

  return {
    obras,
    loading,
    fetchObras,
    createObra,
    updateObra,
    deleteObra,
  };
}

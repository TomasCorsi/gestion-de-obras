import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RemitoDB {
  id: string;
  numero: string;
  viaje_id: string | null;
  fecha: string;
  cliente_id: string;
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
}

export interface RemitoWithRelations extends RemitoDB {
  cliente?: { nombre: string };
  obra?: { nombre: string };
  viaje?: { origen: string; destino: string };
}

export interface RemitoForm {
  numero: string;
  viaje_id?: string;
  fecha: string;
  cliente_id: string;
  obra_id: string;
  material: string;
  cantidad: number;
  unidad: string;
  recibido_por: string;
  firmado: boolean;
  evidencia_url?: string;
  observaciones?: string;
}

export function useRemitos() {
  const [remitos, setRemitos] = useState<RemitoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRemitos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("remitos")
      .select(`
        *,
        cliente:clientes(nombre),
        obra:obras(nombre),
        viaje:viajes(origen, destino)
      `)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error fetching remitos:", error);
      toast.error("Error al cargar remitos");
    } else {
      setRemitos(data || []);
    }
    setLoading(false);
  };

  const createRemito = async (remito: RemitoForm) => {
    const { data, error } = await supabase
      .from("remitos")
      .insert([remito])
      .select()
      .single();

    if (error) {
      console.error("Error creating remito:", error);
      toast.error("Error al crear remito");
      return null;
    }

    toast.success("Remito creado correctamente");
    await fetchRemitos();
    return data;
  };

  const updateRemito = async (id: string, remito: Partial<RemitoForm>) => {
    const { error } = await supabase
      .from("remitos")
      .update(remito)
      .eq("id", id);

    if (error) {
      console.error("Error updating remito:", error);
      toast.error("Error al actualizar remito");
      return false;
    }

    toast.success("Remito actualizado correctamente");
    await fetchRemitos();
    return true;
  };

  const deleteRemito = async (id: string) => {
    const { error } = await supabase
      .from("remitos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting remito:", error);
      toast.error("Error al eliminar remito");
      return false;
    }

    toast.success("Remito eliminado correctamente");
    await fetchRemitos();
    return true;
  };

  useEffect(() => {
    fetchRemitos();
  }, []);

  return {
    remitos,
    loading,
    fetchRemitos,
    createRemito,
    updateRemito,
    deleteRemito,
  };
}

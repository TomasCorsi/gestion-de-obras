import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoViaje = "programado" | "en_curso" | "completado" | "cancelado";

export interface ViajeDB {
  id: string;
  fecha: string;
  obra_id: string;
  chofer_id: string;
  camion_id: string;
  origen: string;
  destino: string;
  material: string;
  volumen: number;
  estado: EstadoViaje;
  hora_inicio: string | null;
  hora_fin: string | null;
  km_recorridos: number | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViajeWithRelations extends ViajeDB {
  obra?: { nombre: string };
  chofer?: { nombre: string; apellido: string };
  camion?: { nombre: string; codigo: string };
}

export interface ViajeForm {
  fecha: string;
  obra_id: string;
  chofer_id: string;
  camion_id: string;
  origen: string;
  destino: string;
  material: string;
  volumen: number;
  estado: EstadoViaje;
  hora_inicio?: string;
  hora_fin?: string;
  km_recorridos?: number;
  observaciones?: string;
}

export function useViajes() {
  const [viajes, setViajes] = useState<ViajeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchViajes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("viajes")
      .select(`
        *,
        obra:obras(nombre),
        chofer:personal!viajes_chofer_id_fkey(nombre, apellido),
        camion:maquinarias!viajes_camion_id_fkey(nombre, codigo)
      `)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error fetching viajes:", error);
      toast.error("Error al cargar viajes");
    } else {
      setViajes(data || []);
    }
    setLoading(false);
  };

  const createViaje = async (viaje: ViajeForm) => {
    const { data, error } = await supabase
      .from("viajes")
      .insert([viaje])
      .select()
      .single();

    if (error) {
      console.error("Error creating viaje:", error);
      toast.error("Error al crear viaje");
      return null;
    }

    toast.success("Viaje creado correctamente");
    await fetchViajes();
    return data;
  };

  const updateViaje = async (id: string, viaje: Partial<ViajeForm>) => {
    const { error } = await supabase
      .from("viajes")
      .update(viaje)
      .eq("id", id);

    if (error) {
      console.error("Error updating viaje:", error);
      toast.error("Error al actualizar viaje");
      return false;
    }

    toast.success("Viaje actualizado correctamente");
    await fetchViajes();
    return true;
  };

  const deleteViaje = async (id: string) => {
    const { error } = await supabase
      .from("viajes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting viaje:", error);
      toast.error("Error al eliminar viaje");
      return false;
    }

    toast.success("Viaje eliminado correctamente");
    await fetchViajes();
    return true;
  };

  useEffect(() => {
    fetchViajes();
  }, []);

  return {
    viajes,
    loading,
    fetchViajes,
    createViaje,
    updateViaje,
    deleteViaje,
  };
}

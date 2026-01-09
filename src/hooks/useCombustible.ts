import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CargaCombustibleDB {
  id: string;
  fecha: string;
  cliente_id: string;
  obra_id: string;
  maquinaria_id: string;
  litros: number;
  precio_litro: number;
  costo_total: number;
  horas_maquina: number;
  estacion: string;
  operador: string;
  comprobante: string | null;
  created_at: string;
  updated_at: string;
}

export interface CargaCombustibleWithRelations extends CargaCombustibleDB {
  cliente?: { nombre: string };
  obra?: { nombre: string };
  maquinaria?: { nombre: string; codigo: string };
}

export interface CargaCombustibleForm {
  fecha: string;
  cliente_id: string;
  obra_id: string;
  maquinaria_id: string;
  litros: number;
  precio_litro: number;
  costo_total: number;
  horas_maquina: number;
  estacion: string;
  operador: string;
  comprobante?: string;
}

export function useCombustible() {
  const [cargas, setCargas] = useState<CargaCombustibleWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCargas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cargas_combustible")
      .select(`
        *,
        cliente:clientes(nombre),
        obra:obras(nombre),
        maquinaria:maquinarias(nombre, codigo)
      `)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error fetching cargas:", error);
      toast.error("Error al cargar registros de combustible");
    } else {
      setCargas(data || []);
    }
    setLoading(false);
  };

  const createCarga = async (carga: CargaCombustibleForm) => {
    const { data, error } = await supabase
      .from("cargas_combustible")
      .insert([carga])
      .select()
      .single();

    if (error) {
      console.error("Error creating carga:", error);
      toast.error("Error al registrar carga");
      return null;
    }

    toast.success("Carga registrada correctamente");
    await fetchCargas();
    return data;
  };

  const updateCarga = async (id: string, carga: Partial<CargaCombustibleForm>) => {
    const { error } = await supabase
      .from("cargas_combustible")
      .update(carga)
      .eq("id", id);

    if (error) {
      console.error("Error updating carga:", error);
      toast.error("Error al actualizar carga");
      return false;
    }

    toast.success("Carga actualizada correctamente");
    await fetchCargas();
    return true;
  };

  const deleteCarga = async (id: string) => {
    const { error } = await supabase
      .from("cargas_combustible")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting carga:", error);
      toast.error("Error al eliminar carga");
      return false;
    }

    toast.success("Carga eliminada correctamente");
    await fetchCargas();
    return true;
  };

  useEffect(() => {
    fetchCargas();
  }, []);

  return {
    cargas,
    loading,
    fetchCargas,
    createCarga,
    updateCarga,
    deleteCarga,
  };
}

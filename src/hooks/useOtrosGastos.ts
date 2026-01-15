import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CategoriaGasto = 
  | "alquiler"
  | "transporte"
  | "servicios"
  | "materiales"
  | "viaticos"
  | "varios";

export interface OtroGastoDB {
  id: string;
  fecha: string;
  obra_id: string | null;
  categoria: string;
  descripcion: string;
  monto: number;
  comprobante: string | null;
  proveedor: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface OtroGastoWithRelations extends OtroGastoDB {
  obra?: { nombre: string };
}

export interface OtroGastoForm {
  fecha: string;
  obra_id?: string | null;
  categoria: string;
  descripcion: string;
  monto?: number;
  comprobante?: string;
  proveedor?: string;
  observaciones?: string;
}

export const categoriasGasto: Record<CategoriaGasto, { label: string; color: string }> = {
  alquiler: { label: "Alquiler", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  transporte: { label: "Transporte", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  servicios: { label: "Servicios", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  materiales: { label: "Materiales", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  viaticos: { label: "Viáticos", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  varios: { label: "Varios", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export function useOtrosGastos() {
  const [gastos, setGastos] = useState<OtroGastoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGastos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("otros_gastos")
      .select(`
        *,
        obra:obras(nombre)
      `)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error fetching otros gastos:", error);
      toast.error("Error al cargar otros gastos");
    } else {
      setGastos(data || []);
    }
    setLoading(false);
  };

  const createGasto = async (gasto: OtroGastoForm) => {
    const { data, error } = await supabase
      .from("otros_gastos")
      .insert([gasto])
      .select()
      .single();

    if (error) {
      console.error("Error creating gasto:", error);
      toast.error("Error al registrar gasto");
      return null;
    }

    toast.success("Gasto registrado correctamente");
    await fetchGastos();
    return data;
  };

  const updateGasto = async (id: string, gasto: Partial<OtroGastoForm>) => {
    const { error } = await supabase
      .from("otros_gastos")
      .update(gasto)
      .eq("id", id);

    if (error) {
      console.error("Error updating gasto:", error);
      toast.error("Error al actualizar gasto");
      return false;
    }

    toast.success("Gasto actualizado correctamente");
    await fetchGastos();
    return true;
  };

  const deleteGasto = async (id: string) => {
    const { error } = await supabase
      .from("otros_gastos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting gasto:", error);
      toast.error("Error al eliminar gasto");
      return false;
    }

    toast.success("Gasto eliminado correctamente");
    await fetchGastos();
    return true;
  };

  useEffect(() => {
    fetchGastos();
  }, []);

  return {
    gastos,
    loading,
    fetchGastos,
    createGasto,
    updateGasto,
    deleteGasto,
  };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TipoMaquinaria, EstadoMaquinaria } from "./useMaquinarias";

export interface AsignacionMaquinariaObra {
  id: string;
  obra_id: string;
  maquinaria_id: string | null;
  tipo_maquinaria: TipoMaquinaria | null;
  cantidad: number;
  horas: number;
  costo_hora: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  maquinaria?: {
    id: string;
    codigo: string | null;
    nombre: string | null;
    tipo: TipoMaquinaria;
    estado: EstadoMaquinaria;
  } | null;
  obra?: {
    id: string;
    nombre: string;
    estado: string;
  };
}

export interface AsignacionMaquinariaForm {
  obra_id: string;
  tipo_maquinaria: TipoMaquinaria;
  cantidad: number;
  horas: number;
  costo_hora: number;
  activa?: boolean;
  observaciones?: string;
  maquinaria_id?: string;
}

export function useAsignacionesMaquinaria() {
  const [asignaciones, setAsignaciones] = useState<AsignacionMaquinariaObra[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAsignaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("asignaciones_maquinaria_obra")
      .select(`
        *,
        maquinaria:maquinarias(id, codigo, nombre, tipo, estado),
        obra:obras(id, nombre, estado)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching asignaciones maquinaria:", error);
      toast.error("Error al cargar asignaciones de maquinaria");
    } else {
      setAsignaciones(data || []);
    }
    setLoading(false);
  };

  const createAsignacion = async (asignacion: AsignacionMaquinariaForm) => {
    const { data, error } = await supabase
      .from("asignaciones_maquinaria_obra")
      .insert([asignacion])
      .select(`
        *,
        maquinaria:maquinarias(id, codigo, nombre, tipo, estado),
        obra:obras(id, nombre, estado)
      `)
      .single();

    if (error) {
      console.error("Error creating asignacion maquinaria:", error);
      if (error.code === "23505") {
        toast.error("Ya existe una asignación de esta maquinaria para esta obra");
      } else {
        toast.error("Error al crear asignación de maquinaria");
      }
      return null;
    }

    toast.success("Asignación de maquinaria creada correctamente");
    await fetchAsignaciones();
    return data;
  };

  const updateAsignacion = async (id: string, asignacion: Partial<AsignacionMaquinariaForm>) => {
    const { error } = await supabase
      .from("asignaciones_maquinaria_obra")
      .update(asignacion)
      .eq("id", id);

    if (error) {
      console.error("Error updating asignacion maquinaria:", error);
      toast.error("Error al actualizar asignación de maquinaria");
      return false;
    }

    toast.success("Asignación de maquinaria actualizada correctamente");
    await fetchAsignaciones();
    return true;
  };

  const deleteAsignacion = async (id: string) => {
    const { error } = await supabase
      .from("asignaciones_maquinaria_obra")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting asignacion maquinaria:", error);
      toast.error("Error al eliminar asignación de maquinaria");
      return false;
    }

    toast.success("Asignación de maquinaria eliminada correctamente");
    await fetchAsignaciones();
    return true;
  };

  // Get asignaciones grouped by obra
  const asignacionesPorObra = asignaciones.reduce((acc, asig) => {
    const obraId = asig.obra_id;
    if (!acc[obraId]) {
      acc[obraId] = {
        obra: asig.obra,
        asignaciones: [],
        totalCostoHora: 0,
      };
    }
    acc[obraId].asignaciones.push(asig);
    acc[obraId].totalCostoHora += asig.costo_hora || 0;
    return acc;
  }, {} as Record<string, { obra: AsignacionMaquinariaObra["obra"]; asignaciones: AsignacionMaquinariaObra[]; totalCostoHora: number }>);

  // Get only active asignaciones
  const asignacionesActivas = asignaciones.filter(a => a.activa);

  useEffect(() => {
    fetchAsignaciones();
  }, []);

  return {
    asignaciones,
    asignacionesActivas,
    asignacionesPorObra,
    loading,
    fetchAsignaciones,
    createAsignacion,
    updateAsignacion,
    deleteAsignacion,
  };
}

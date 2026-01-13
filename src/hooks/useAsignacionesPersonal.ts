import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RolPersonal } from "./usePersonal";

export interface AsignacionPersonalObra {
  id: string;
  obra_id: string;
  rol: RolPersonal;
  cantidad: number;
  sueldo_mensual: number;
  costo_total: number;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  obra?: {
    id: string;
    nombre: string;
    estado: string;
  };
}

export interface AsignacionForm {
  obra_id: string;
  rol: RolPersonal;
  cantidad: number;
  sueldo_mensual: number;
  observaciones?: string;
}

export function useAsignacionesPersonal() {
  const [asignaciones, setAsignaciones] = useState<AsignacionPersonalObra[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAsignaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("asignaciones_personal_obra")
      .select(`
        *,
        obra:obras(id, nombre, estado)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching asignaciones:", error);
      toast.error("Error al cargar asignaciones de personal");
    } else {
      setAsignaciones(data || []);
    }
    setLoading(false);
  };

  const createAsignacion = async (asignacion: AsignacionForm) => {
    const { data, error } = await supabase
      .from("asignaciones_personal_obra")
      .insert([asignacion])
      .select(`
        *,
        obra:obras(id, nombre, estado)
      `)
      .single();

    if (error) {
      console.error("Error creating asignacion:", error);
      if (error.code === "23505") {
        toast.error("Ya existe una asignación de ese rol para esta obra");
      } else {
        toast.error("Error al crear asignación");
      }
      return null;
    }

    toast.success("Asignación creada correctamente");
    await fetchAsignaciones();
    return data;
  };

  const updateAsignacion = async (id: string, asignacion: Partial<AsignacionForm>) => {
    const { error } = await supabase
      .from("asignaciones_personal_obra")
      .update(asignacion)
      .eq("id", id);

    if (error) {
      console.error("Error updating asignacion:", error);
      toast.error("Error al actualizar asignación");
      return false;
    }

    toast.success("Asignación actualizada correctamente");
    await fetchAsignaciones();
    return true;
  };

  const deleteAsignacion = async (id: string) => {
    const { error } = await supabase
      .from("asignaciones_personal_obra")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting asignacion:", error);
      toast.error("Error al eliminar asignación");
      return false;
    }

    toast.success("Asignación eliminada correctamente");
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
        totalSueldos: 0,
      };
    }
    acc[obraId].asignaciones.push(asig);
    acc[obraId].totalSueldos += asig.costo_total || 0;
    return acc;
  }, {} as Record<string, { obra: AsignacionPersonalObra["obra"]; asignaciones: AsignacionPersonalObra[]; totalSueldos: number }>);

  useEffect(() => {
    fetchAsignaciones();
  }, []);

  return {
    asignaciones,
    asignacionesPorObra,
    loading,
    fetchAsignaciones,
    createAsignacion,
    updateAsignacion,
    deleteAsignacion,
  };
}

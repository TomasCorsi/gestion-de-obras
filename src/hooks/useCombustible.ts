import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CargaCombustibleDB {
  id: string;
  fecha: string;
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
  obra?: { nombre: string };
  maquinaria?: { nombre: string; codigo: string };
}

export interface CargaCombustibleForm {
  fecha?: string;
  obra_id?: string;
  maquinaria_id?: string;
  litros?: number;
  precio_litro?: number;
  costo_total?: number;
  horas_maquina?: number;
  estacion?: string;
  operador?: string;
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

  const batchSave = async (changes: {
    created: CargaCombustibleForm[];
    updated: { id: string; data: Partial<CargaCombustibleForm> }[];
    deleted: string[];
  }) => {
    const results = { created: 0, updated: 0, deleted: 0, errors: 0 };
    const promises: Promise<void>[] = [];

    // Batch insert (single call)
    if (changes.created.length > 0) {
      const insertPromise = (async () => {
        const { error } = await supabase
          .from("cargas_combustible")
          .insert(changes.created);
        if (error) {
          console.error("Error batch insert:", error);
          results.errors++;
        } else {
          results.created = changes.created.length;
        }
      })();
      promises.push(insertPromise);
    }

    // Parallel updates
    for (const { id, data } of changes.updated) {
      const updatePromise = (async () => {
        const { error } = await supabase
          .from("cargas_combustible")
          .update(data)
          .eq("id", id);
        if (error) {
          console.error("Error updating:", error);
          results.errors++;
        } else {
          results.updated++;
        }
      })();
      promises.push(updatePromise);
    }

    // Batch delete (single call with array of IDs)
    if (changes.deleted.length > 0) {
      const deletePromise = (async () => {
        const { error } = await supabase
          .from("cargas_combustible")
          .delete()
          .in("id", changes.deleted);
        if (error) {
          console.error("Error batch delete:", error);
          results.errors++;
        } else {
          results.deleted = changes.deleted.length;
        }
      })();
      promises.push(deletePromise);
    }

    await Promise.all(promises);
    await fetchCargas();

    return results;
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
    batchSave,
  };
}

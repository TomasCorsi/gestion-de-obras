import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoCotizacion = "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida";

export interface CotizacionDB {
  id: string;
  numero: string;
  obra_id: string | null;
  descripcion: string;
  estado: EstadoCotizacion;
  fecha_creacion: string;
  fecha_vencimiento: string;
  responsable: string;
  subtotal: number;
  iva: number;
  total: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface CotizacionItemDB {
  id: string;
  cotizacion_id: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: string;
}

export interface CotizacionWithRelations extends CotizacionDB {
  obra?: { nombre: string };
  items?: CotizacionItemDB[];
}

export interface CotizacionForm {
  numero: string;
  obra_id?: string;
  descripcion: string;
  estado: EstadoCotizacion;
  fecha_creacion: string;
  fecha_vencimiento: string;
  responsable: string;
  subtotal: number;
  iva: number;
  total: number;
  notas?: string;
}

export interface CotizacionItemForm {
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCotizaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cotizaciones")
      .select(`
        *,
        obra:obras(nombre),
        items:cotizacion_items(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching cotizaciones:", error);
      toast.error("Error al cargar cotizaciones");
    } else {
      setCotizaciones(data || []);
    }
    setLoading(false);
  };

  const createCotizacion = async (cot: CotizacionForm, items: CotizacionItemForm[]) => {
    const { data: cotData, error: cotError } = await supabase
      .from("cotizaciones")
      .insert([cot])
      .select()
      .single();

    if (cotError) {
      console.error("Error creating cotizacion:", cotError);
      toast.error("Error al crear cotización");
      return null;
    }

    if (items.length > 0) {
      const itemsWithCotId = items.map(item => ({
        ...item,
        cotizacion_id: cotData.id,
      }));

      const { error: itemsError } = await supabase
        .from("cotizacion_items")
        .insert(itemsWithCotId);

      if (itemsError) {
        console.error("Error creating cotizacion items:", itemsError);
        toast.error("Error al crear ítems de cotización");
      }
    }

    toast.success("Cotización creada correctamente");
    await fetchCotizaciones();
    return cotData;
  };

  const updateCotizacion = async (id: string, cot: Partial<CotizacionForm>) => {
    const { error } = await supabase
      .from("cotizaciones")
      .update(cot)
      .eq("id", id);

    if (error) {
      console.error("Error updating cotizacion:", error);
      toast.error("Error al actualizar cotización");
      return false;
    }

    toast.success("Cotización actualizada correctamente");
    await fetchCotizaciones();
    return true;
  };

  const deleteCotizacion = async (id: string) => {
    const { error } = await supabase
      .from("cotizaciones")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting cotizacion:", error);
      toast.error("Error al eliminar cotización");
      return false;
    }

    toast.success("Cotización eliminada correctamente");
    await fetchCotizaciones();
    return true;
  };

  useEffect(() => {
    fetchCotizaciones();
  }, []);

  return {
    cotizaciones,
    loading,
    fetchCotizaciones,
    createCotizacion,
    updateCotizacion,
    deleteCotizacion,
  };
}

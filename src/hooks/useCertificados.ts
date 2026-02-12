import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---- Types ----

export interface CertificadoConcepto {
  id: string;
  obra_id: string;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  activo: boolean;
  orden: number;
  categoria: string;
  created_at: string;
  updated_at: string;
}

export interface ConceptoForm {
  obra_id: string;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  activo?: boolean;
  orden?: number;
  categoria?: string;
}

export type EstadoCertificado = "borrador" | "emitido" | "cobrado";

export interface Certificado {
  id: string;
  obra_id: string;
  numero: string;
  periodo: string;
  estado: EstadoCertificado;
  fecha_emision: string | null;
  subtotal: number;
  iva: number;
  total: number;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificadoItem {
  id: string;
  certificado_id: string;
  concepto_id: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: string;
}

export interface CertificadoItemForm {
  concepto_id: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  categoria: string;
}

// ---- Categories ----

export const CATEGORIAS_CERTIFICADO = [
  "Alquiler de Maquinas",
  "Materiales",
  "Transporte",
  "Servicios",
  "General",
];

// ---- Predefined concepts ----

export const CONCEPTOS_ESTANDAR: { nombre: string; unidad: string; categoria: string }[] = [
  { nombre: "Horas Retroexcavadora", unidad: "HR", categoria: "Alquiler de Maquinas" },
  { nombre: "Horas Cargadora", unidad: "HR", categoria: "Alquiler de Maquinas" },
  { nombre: "Horas Topador", unidad: "HR", categoria: "Alquiler de Maquinas" },
  { nombre: "Horas Motoniveladora", unidad: "HR", categoria: "Alquiler de Maquinas" },
  { nombre: "Alquiler Máquina por día", unidad: "DIA", categoria: "Alquiler de Maquinas" },
  { nombre: "Gasoil", unidad: "LT", categoria: "Servicios" },
  { nombre: "Tosca", unidad: "M3", categoria: "Materiales" },
  { nombre: "Tierra", unidad: "M3", categoria: "Materiales" },
  { nombre: "Cascote", unidad: "M3", categoria: "Materiales" },
  { nombre: "Piedra", unidad: "M3", categoria: "Materiales" },
  { nombre: "Fresado", unidad: "M3", categoria: "Materiales" },
  { nombre: "Suelo Cemento", unidad: "M3", categoria: "Materiales" },
  { nombre: "Cunetas", unidad: "ML", categoria: "Servicios" },
  { nombre: "Viajes", unidad: "VJ", categoria: "Transporte" },
];

// ---- Hook ----

export function useCertificados(obraId?: string) {
  const queryClient = useQueryClient();

  // Conceptos for selected obra
  const { data: conceptos = [], isLoading: loadingConceptos } = useQuery({
    queryKey: ["certificado_conceptos", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from("certificado_conceptos")
        .select("*")
        .eq("obra_id", obraId)
        .order("orden", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        categoria: d.categoria || "General",
      })) as CertificadoConcepto[];
    },
    enabled: !!obraId,
  });

  // Certificados for selected obra
  const { data: certificados = [], isLoading: loadingCertificados } = useQuery({
    queryKey: ["certificados", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from("certificados")
        .select("*")
        .eq("obra_id", obraId)
        .order("periodo", { ascending: false });
      if (error) throw error;
      return data as Certificado[];
    },
    enabled: !!obraId,
  });

  // Items for a specific certificado
  const fetchItems = async (certificadoId: string): Promise<CertificadoItem[]> => {
    const { data, error } = await supabase
      .from("certificado_items")
      .select("*")
      .eq("certificado_id", certificadoId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as CertificadoItem[];
  };

  // ---- Concepto mutations ----

  const createConcepto = useMutation({
    mutationFn: async (concepto: ConceptoForm) => {
      const { data, error } = await supabase
        .from("certificado_conceptos")
        .insert([concepto])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Concepto agregado");
      queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
    },
    onError: () => toast.error("Error al agregar concepto"),
  });

  const updateConcepto = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ConceptoForm> & { id: string }) => {
      const { error } = await supabase
        .from("certificado_conceptos")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto actualizado");
      queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
    },
    onError: () => toast.error("Error al actualizar concepto"),
  });

  const deleteConcepto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("certificado_conceptos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto eliminado");
      queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
    },
    onError: () => toast.error("Error al eliminar concepto"),
  });

  // ---- Certificado mutations ----

  const createCertificado = useMutation({
    mutationFn: async ({
      periodo,
      items,
    }: {
      periodo: string;
      items: CertificadoItemForm[];
    }) => {
      if (!obraId) throw new Error("No obra selected");

      // Generate numero
      const count = certificados.filter((c) => c.obra_id === obraId).length;
      const numero = `CERT-${String(count + 1).padStart(3, "0")}`;

      const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
      const iva = Math.round(subtotal * 0.21 * 100) / 100;
      const total = subtotal + iva;

      const { data: cert, error } = await supabase
        .from("certificados")
        .insert([{ obra_id: obraId, numero, periodo, subtotal, iva, total }])
        .select()
        .single();
      if (error) throw error;

      // Insert items
      const itemsToInsert = items
        .filter((i) => i.cantidad > 0)
        .map((i) => ({
          certificado_id: cert.id,
          concepto_id: i.concepto_id,
          descripcion: i.descripcion,
          unidad: i.unidad,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("certificado_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      return cert;
    },
    onSuccess: () => {
      toast.success("Certificado creado");
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Error al crear certificado");
    },
  });

  const updateCertificadoEstado = useMutation({
    mutationFn: async ({
      id,
      estado,
      fecha_emision,
    }: {
      id: string;
      estado: EstadoCertificado;
      fecha_emision?: string;
    }) => {
      const updates: Record<string, unknown> = { estado };
      if (fecha_emision) updates.fecha_emision = fecha_emision;
      const { error } = await supabase
        .from("certificados")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
    },
    onError: () => toast.error("Error al actualizar estado"),
  });

  const deleteCertificado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("certificados")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Certificado eliminado");
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
    },
    onError: () => toast.error("Error al eliminar certificado"),
  });

  return {
    conceptos,
    loadingConceptos,
    certificados,
    loadingCertificados,
    fetchItems,
    createConcepto: createConcepto.mutateAsync,
    updateConcepto: updateConcepto.mutateAsync,
    deleteConcepto: deleteConcepto.mutateAsync,
    createCertificado: createCertificado.mutateAsync,
    updateCertificadoEstado: updateCertificadoEstado.mutateAsync,
    deleteCertificado: deleteCertificado.mutateAsync,
  };
}

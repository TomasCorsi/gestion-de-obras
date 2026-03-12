import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---- Types ----

export type TipoCertificado = "obra" | "servicio" | "mixto";

export interface CertificadoConcepto {
  id: string;
  obra_id: string;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  activo: boolean;
  orden: number;
  categoria: string;
  cantidad_total: number;
  etapa: string | null;
  tipo: 'obra' | 'servicio';
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
  cantidad_total?: number;
  etapa?: string | null;
  tipo?: 'obra' | 'servicio';
}

export interface CertificadoPago {
  id: string;
  certificado_id: string;
  fecha: string;
  monto: number;
  descripcion: string | null;
  created_at: string;
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
  tipo: TipoCertificado;
  anticipo_porcentaje: number;
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
  etapa: string | null;
  seccion: string | null;
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
  etapa: string | null;
  cantidad_total: number;
  seccion?: string | null;
  observaciones?: string;
}

// ---- Categories ----

export const CATEGORIAS_CERTIFICADO = [
  "Alquiler de Maquinas",
  "Ejecución de obra",
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

// ---- Acumulados helper ----

export interface AcumuladoConcepto {
  concepto_id: string;
  cantidad_anterior: number;
  avance_anterior: number;
}

export async function fetchAcumulados(
  obraId: string,
  periodoActual: string,
  excludeCertId?: string
): Promise<AcumuladoConcepto[]> {
  // Get all certificados of type 'obra' or 'mixto' for this obra with periodo < periodoActual
  const { data: certs, error } = await supabase
    .from("certificados")
    .select("id, periodo")
    .eq("obra_id", obraId)
    .in("tipo", ["obra", "mixto"])
    .lt("periodo", periodoActual);

  if (error || !certs || certs.length === 0) return [];

  const certIds = certs
    .filter((c) => !excludeCertId || c.id !== excludeCertId)
    .map((c) => c.id);

  if (certIds.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from("certificado_items")
    .select("concepto_id, cantidad, precio_unitario")
    .in("certificado_id", certIds);

  if (itemsError || !items) return [];

  // Aggregate by concepto_id
  const map = new Map<string, { cantidad: number; avance: number }>();
  items.forEach((item) => {
    if (!item.concepto_id) return;
    const existing = map.get(item.concepto_id) || { cantidad: 0, avance: 0 };
    existing.cantidad += item.cantidad;
    existing.avance += item.cantidad * item.precio_unitario;
    map.set(item.concepto_id, existing);
  });

  return [...map.entries()].map(([concepto_id, { cantidad, avance }]) => ({
    concepto_id,
    cantidad_anterior: cantidad,
    avance_anterior: avance,
  }));
}

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
        cantidad_total: d.cantidad_total || 0,
        etapa: d.etapa || null,
        tipo: (d.tipo === 'obra' ? 'obra' : 'servicio') as 'obra' | 'servicio',
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
      return (data as any[]).map((d) => ({
        ...d,
        tipo: d.tipo || "servicio",
        anticipo_porcentaje: d.anticipo_porcentaje || 0,
      })) as Certificado[];
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
    return (data as any[]).map((d) => ({
      ...d,
      etapa: d.etapa || null,
      seccion: d.seccion || null,
    })) as CertificadoItem[];
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
      observaciones,
      tipo = "servicio",
      anticipo_porcentaje = 0,
    }: {
      periodo: string;
      items: CertificadoItemForm[];
      observaciones?: string;
      tipo?: TipoCertificado;
      anticipo_porcentaje?: number;
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
        .insert([{
          obra_id: obraId,
          numero,
          periodo,
          subtotal,
          iva,
          total,
          observaciones: observaciones || null,
          tipo,
          anticipo_porcentaje,
        }])
        .select()
        .single();
      if (error) throw error;

      // Insert items
      const itemsToInsert = items
        .map((i) => ({
          certificado_id: cert.id,
          concepto_id: i.concepto_id,
          descripcion: i.descripcion,
          unidad: i.unidad,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
          etapa: i.etapa || null,
          seccion: i.seccion || null,
          observaciones: i.observaciones || null,
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

  const updateCertificado = useMutation({
    mutationFn: async ({
      id,
      periodo,
      items,
      observaciones,
      tipo,
      anticipo_porcentaje,
      numero,
    }: {
      id: string;
      periodo: string;
      items: CertificadoItemForm[];
      observaciones?: string;
      tipo?: TipoCertificado;
      anticipo_porcentaje?: number;
      numero?: string;
    }) => {
      const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
      const iva = Math.round(subtotal * 0.21 * 100) / 100;
      const total = subtotal + iva;

      const updateData: Record<string, unknown> = { periodo, subtotal, iva, total, observaciones: observaciones || null };
      if (tipo !== undefined) updateData.tipo = tipo;
      if (anticipo_porcentaje !== undefined) updateData.anticipo_porcentaje = anticipo_porcentaje;
      if (numero !== undefined && numero.trim() !== "") updateData.numero = numero.trim();

      // Update certificado header
      const { error } = await supabase
        .from("certificados")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;

      // Delete existing items and re-insert
      const { error: delError } = await supabase
        .from("certificado_items")
        .delete()
        .eq("certificado_id", id);
      if (delError) throw delError;

      const itemsToInsert = items
        .map((i) => ({
          certificado_id: id,
          concepto_id: i.concepto_id,
          descripcion: i.descripcion,
          unidad: i.unidad,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
          etapa: i.etapa || null,
          seccion: i.seccion || null,
          observaciones: i.observaciones || null,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("certificado_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      toast.success("Certificado actualizado");
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Error al actualizar certificado");
    },
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

  // ---- Reorder etapas by updating orden on conceptos ----
  const reorderEtapas = async (etapaOrder: { etapa: string; orden: number }[]) => {
    if (!obraId) return;
    // For each etapa, update all conceptos belonging to it with the new base orden
    const updates = etapaOrder.flatMap(({ etapa, orden }) => {
      return conceptos
        .filter((c) => (c.etapa || "Sin etapa") === etapa)
        .map((c, idx) => ({
          id: c.id,
          orden: orden * 1000 + idx, // multiply to leave room for intra-etapa ordering
        }));
    });

    for (const { id, orden } of updates) {
      const { error } = await supabase
        .from("certificado_conceptos")
        .update({ orden })
        .eq("id", id);
      if (error) throw error;
    }

    toast.success("Orden de etapas actualizado");
    queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
  };

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
    updateCertificado: updateCertificado.mutateAsync,
    updateCertificadoEstado: updateCertificadoEstado.mutateAsync,
    deleteCertificado: deleteCertificado.mutateAsync,
    reorderEtapas,
  };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { traducirError, type DocTipo } from "@/lib/contab1c";

const sb = supabase as any;
const fallo = (e: any) => toast.error(traducirError(e?.message));

export interface Reparto {
  id: string; item_id: string; subcentro_id: string; modo: "importe" | "porcentaje";
  porcentaje: number | null; importe: number; ajuste_redondeo: number; importe_efectivo: number;
  obra_id: string | null; obra_atribucion: string | null; maquinaria_id: string | null; nota: string | null;
}
export interface Vinculo {
  id: string; comprobante_id: string; item_id: string | null; clase: "trazabilidad" | "facturable";
  doc_tipo: DocTipo; doc_id: string; importe_vinculado: number | null; estado: "vigente" | "anulado"; nota: string | null;
}
export interface DocOperativo { id: string; etiqueta: string; fecha: string | null; referencia: number | null; facturado: number; }

const invalidar = (qc: ReturnType<typeof useQueryClient>) =>
  ["contab_repartos", "contab_vinculos", "contab_docs_op", "contab_asiento_cbte", "contab_imputaciones", "contab_comprobantes", "contab_cbte_one", "contab_asientos"]
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

export const useRepartos = (itemIds: string[]) => useQuery({
  queryKey: ["contab_repartos", itemIds.join(",")], enabled: itemIds.length > 0,
  queryFn: async () => {
    const { data, error } = await sb.from("contab_item_repartos").select("*").in("item_id", itemIds).order("created_at");
    if (error) throw error; return (data ?? []) as Reparto[];
  },
});

export const useSaveReparto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: { item_id: string; subcentro_id: string; modo: "importe" | "porcentaje"; valor: number; obra_id: string | null; maquinaria_id: string | null; nota: string | null }) => {
      // El importe de un reparto por porcentaje lo recalcula la base; se envía un valor provisorio positivo.
      const row: any = {
        item_id: r.item_id, subcentro_id: r.subcentro_id, modo: r.modo,
        porcentaje: r.modo === "porcentaje" ? r.valor : null,
        importe: r.modo === "importe" ? r.valor : 0.01,
        obra_id: r.obra_id, maquinaria_id: r.maquinaria_id, nota: r.nota || null,
      };
      const { error } = await sb.from("contab_item_repartos").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { invalidar(qc); toast.success("Reparto agregado"); },
    onError: fallo,
  });
};

export const useDeleteReparto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("contab_item_repartos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidar(qc); toast.success("Reparto quitado"); },
    onError: fallo,
  });
};

export const useVinculos = (cbteId: string | null) => useQuery({
  queryKey: ["contab_vinculos", cbteId], enabled: !!cbteId,
  queryFn: async () => {
    const { data, error } = await sb.from("contab_vinculos_operativos").select("*").eq("comprobante_id", cbteId).order("created_at");
    if (error) throw error; return (data ?? []) as Vinculo[];
  },
});

export const useAddVinculo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { comprobante_id: string; item_id: string; clase: "trazabilidad" | "facturable"; doc_tipo: DocTipo; doc_id: string; importe: number | null; nota: string | null }) => {
      const { error } = await sb.from("contab_vinculos_operativos").insert({
        comprobante_id: v.comprobante_id, item_id: v.item_id, clase: v.clase, doc_tipo: v.doc_tipo, doc_id: v.doc_id,
        importe_vinculado: v.clase === "facturable" ? v.importe : null, nota: v.nota || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidar(qc); toast.success("Vínculo agregado"); },
    onError: fallo,
  });
};

export const useAnularVinculo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; motivo: string }) => {
      const { error } = await sb.from("contab_vinculos_operativos")
        .update({ estado: "anulado", anulado_at: new Date().toISOString(), anulado_motivo: p.motivo }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidar(qc); toast.success("Vínculo anulado"); },
    onError: fallo,
  });
};

const fmtF = (s: string | null) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "");

/** Busca documentos operativos filtrados por tipo de operación y cliente/proveedor; solo lectura de columnas puntuales. */
export const useDocsOperativos = (p: { tipo: DocTipo | null; proveedorId: string | null; clienteId: string | null; q: string; hasta: string }) =>
  useQuery({
    queryKey: ["contab_docs_op", p.tipo, p.proveedorId, p.clienteId, p.q, p.hasta], enabled: !!p.tipo,
    queryFn: async (): Promise<DocOperativo[]> => {
      const q = p.q.trim();
      const like = `%${q}%`;
      let rows: { id: string; etiqueta: string; fecha: string | null; referencia: number | null }[] = [];
      const lim = 60;
      switch (p.tipo) {
        case "orden_compra": case "orden_compra_item": {
          let oq = sb.from("ordenes_compra").select("id, numero, fecha, proveedor_id").lte("fecha", p.hasta).order("fecha", { ascending: false }).limit(lim);
          if (p.proveedorId) oq = oq.eq("proveedor_id", p.proveedorId);
          if (q && p.tipo === "orden_compra") oq = oq.ilike("numero", like);
          const { data: ocs, error } = await oq; if (error) throw error;
          if (p.tipo === "orden_compra") { rows = (ocs ?? []).map((o: any) => ({ id: o.id, etiqueta: `OC ${o.numero}`, fecha: o.fecha, referencia: null })); break; }
          const ids = (ocs ?? []).map((o: any) => o.id); if (!ids.length) break;
          let iq = sb.from("orden_compra_items").select("id, descripcion, subtotal, orden_id").in("orden_id", ids).limit(200);
          if (q) iq = iq.ilike("descripcion", like);
          const { data, error: e2 } = await iq; if (e2) throw e2;
          const oc = new Map((ocs ?? []).map((o: any) => [o.id, o]));
          rows = (data ?? []).map((i: any) => ({ id: i.id, etiqueta: `OC ${(oc.get(i.orden_id) as any)?.numero ?? ""} · ${i.descripcion}`, fecha: (oc.get(i.orden_id) as any)?.fecha ?? null, referencia: Number(i.subtotal) }));
          break;
        }
        case "remito_materiales": {
          let x = sb.from("remitos_materiales").select("id, fecha, numero_remito, material, cantidad, unidad, precio_unitario, proveedor_id").lte("fecha", p.hasta).order("fecha", { ascending: false }).limit(lim);
          if (p.proveedorId) x = x.eq("proveedor_id", p.proveedorId);
          if (q) x = x.or(`numero_remito.ilike.${like},material.ilike.${like}`);
          const { data, error } = await x; if (error) throw error;
          rows = (data ?? []).map((r: any) => ({ id: r.id, etiqueta: `Remito ${r.numero_remito ?? "s/n"} · ${r.material} ${r.cantidad} ${r.unidad}`, fecha: r.fecha, referencia: Number(r.cantidad) * Number(r.precio_unitario) }));
          break;
        }
        case "remito_maquinas": {
          let x = sb.from("remitos_maquinas").select("id, fecha, numero_remito, cantidad, unidad, precio_unitario").lte("fecha", p.hasta).order("fecha", { ascending: false }).limit(lim);
          if (q) x = x.ilike("numero_remito", like);
          const { data, error } = await x; if (error) throw error;
          rows = (data ?? []).map((r: any) => ({ id: r.id, etiqueta: `Remito máq. ${r.numero_remito ?? "s/n"} · ${r.cantidad} ${r.unidad}`, fecha: r.fecha, referencia: Number(r.cantidad) * Number(r.precio_unitario) }));
          break;
        }
        case "mantenimiento": {
          let x = sb.from("mantenimientos").select("id, fecha, descripcion, costo_total").lte("fecha", p.hasta).order("fecha", { ascending: false }).limit(lim);
          if (q) x = x.ilike("descripcion", like);
          const { data, error } = await x; if (error) throw error;
          rows = (data ?? []).map((r: any) => ({ id: r.id, etiqueta: `Mant. · ${r.descripcion}`, fecha: r.fecha, referencia: Number(r.costo_total) }));
          break;
        }
        case "carga_combustible": {
          let x = sb.from("cargas_combustible_repartidor").select("id, fecha, numero_remito, litros, tipo_producto").lte("fecha", p.hasta).order("fecha", { ascending: false }).limit(lim);
          if (q && /^\d+$/.test(q)) x = x.eq("numero_remito", Number(q));
          const { data, error } = await x; if (error) throw error;
          rows = (data ?? []).map((r: any) => ({ id: r.id, etiqueta: `Combustible ${r.numero_remito ?? "s/n"} · ${r.litros} L ${r.tipo_producto ?? ""}`, fecha: r.fecha, referencia: null }));
          break;
        }
        case "movimiento_stock": {
          let x = sb.from("movimientos_stock").select("id, fecha, motivo, cantidad, tipo").lte("fecha", p.hasta).order("fecha", { ascending: false }).limit(lim);
          if (q) x = x.ilike("motivo", like);
          const { data, error } = await x; if (error) throw error;
          rows = (data ?? []).map((r: any) => ({ id: r.id, etiqueta: `Stock ${r.tipo} · ${r.motivo} (${r.cantidad})`, fecha: r.fecha, referencia: null }));
          break;
        }
        case "otro_gasto": {
          let x = sb.from("otros_gastos").select("id, fecha, descripcion, monto, proveedor").lte("fecha", p.hasta).order("fecha", { ascending: false }).limit(lim);
          if (q) x = x.or(`descripcion.ilike.${like},proveedor.ilike.${like}`);
          const { data, error } = await x; if (error) throw error;
          rows = (data ?? []).map((r: any) => ({ id: r.id, etiqueta: `Gasto · ${r.descripcion}${r.proveedor ? ` (${r.proveedor})` : ""}`, fecha: r.fecha, referencia: Number(r.monto) }));
          break;
        }
        case "certificado": {
          let obraIds: string[] | null = null;
          if (p.clienteId) {
            const { data: obs, error } = await sb.from("obras").select("id").eq("cliente_id", p.clienteId);
            if (error) throw error; obraIds = (obs ?? []).map((o: any) => o.id);
            if (!obraIds.length) break;
          }
          let x = sb.from("certificados").select("id, numero, periodo, fecha_certificado, subtotal, obra_id").lte("fecha_certificado", p.hasta).order("fecha_certificado", { ascending: false }).limit(lim);
          if (obraIds) x = x.in("obra_id", obraIds);
          if (q) x = x.ilike("numero", like);
          const { data, error } = await x; if (error) throw error;
          rows = (data ?? []).map((r: any) => ({ id: r.id, etiqueta: `Certificado ${r.numero} · ${r.periodo}`, fecha: r.fecha_certificado, referencia: Number(r.subtotal) }));
          break;
        }
      }
      if (!rows.length) return [];
      const { data: sal, error } = await sb.from("contab_vinculos_saldos").select("doc_id, facturado").eq("doc_tipo", p.tipo).in("doc_id", rows.map((r) => r.id));
      if (error) throw error;
      const fac = new Map((sal ?? []).map((s: any) => [s.doc_id, Number(s.facturado)]));
      return rows.map((r) => ({ ...r, etiqueta: `${fmtF(r.fecha)} · ${r.etiqueta}`, referencia: r.referencia && r.referencia > 0 ? r.referencia : null, facturado: (fac.get(r.id) as number) ?? 0 }));
    },
  });

/** Etiquetas y saldos de los documentos ya vinculados. */
export const useSaldosVinculados = (vinc: Vinculo[]) => useQuery({
  queryKey: ["contab_docs_op", "saldos", vinc.map((v) => v.doc_id).join(",")], enabled: vinc.length > 0,
  queryFn: async () => {
    const { data, error } = await sb.from("contab_vinculos_saldos").select("doc_tipo, doc_id, importe_referencia, facturado, saldo_pendiente").in("doc_id", vinc.map((v) => v.doc_id));
    if (error) throw error;
    return new Map((data ?? []).map((s: any) => [`${s.doc_tipo}:${s.doc_id}`, s])) as Map<string, { importe_referencia: number | null; facturado: number; saldo_pendiente: number | null }>;
  },
});

export const useAsientoCbte = (asientoId: string | null) => useQuery({
  queryKey: ["contab_asiento_cbte", asientoId], enabled: !!asientoId,
  queryFn: async () => {
    const { data: a, error } = await sb.from("contab_asientos").select("id, numero, fecha, estado, descripcion, total_debe, total_haber").eq("id", asientoId).single();
    if (error) throw error;
    const { data: l, error: e2 } = await sb.from("contab_asiento_lineas")
      .select("id, orden, debe, haber, descripcion, item_id, cuenta:contab_plan_cuentas(codigo, nombre)").eq("asiento_id", asientoId).order("orden");
    if (e2) throw e2;
    return { asiento: a, lineas: l ?? [] };
  },
});

export const useGenerarAsientoCbte = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { cbteId: string; regenerar: boolean }) => {
      const { data, error } = await sb.rpc("contab_generar_asiento_cbte", { _cbte_id: p.cbteId });
      if (error) throw error; return data as string;
    },
    onSuccess: (_d, p) => { invalidar(qc); toast.success(p.regenerar ? "Asiento borrador regenerado" : "Asiento borrador generado"); },
    onError: fallo,
  });
};

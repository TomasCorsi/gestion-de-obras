import { supabase } from "@/integrations/supabase/client";
import type { RemitoWithRelations } from "@/hooks/useRemitos";
import type { RemitoItem } from "@/hooks/useRemitoItems";
import type { RenglonRemito } from "@/lib/remitosResumen";

const sb = supabase as any;
type Row = Record<string, any>;

async function all(table: string, select: string, order = "id"): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).order(order).range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

const MOV: Record<string, string> = { ingreso_proveedor: "Ingreso de proveedor", traslado_obra: "Traslado entre obras", salida: "Salida / Otro" };

/** Trae remitos de materiales y de máquinas normalizados como renglones. */
export async function fetchRenglonesOtros(): Promise<RenglonRemito[]> {
  const [obras, clientes, maqs, provs, cat, mats, matItems, maqRem] = await Promise.all([
    all("obras", "id,nombre,numero,cliente_id"),
    all("clientes", "id,nombre"),
    all("maquinarias", "id,codigo,nombre,patente"),
    all("proveedores", "id,nombre"),
    all("materiales_catalogo", "id,nombre"),
    all("remitos_materiales", "*"),
    all("remito_material_items", "*"),
    all("remitos_maquinas", "*, remito_maquina_items(*)"),
  ]);
  const by = (rs: Row[]) => Object.fromEntries(rs.map((r) => [r.id, r]));
  const O = by(obras), C = by(clientes), M = by(maqs), P = by(provs), CAT = by(cat);
  const obraLbl = (id?: string) => (id && O[id] ? O[id].nombre : "");
  const out: RenglonRemito[] = [];

  const itemsPor: Record<string, Row[]> = {};
  matItems.forEach((i) => (itemsPor[i.remito_id] ||= []).push(i));
  for (const r of mats) {
    const its = itemsPor[r.id]?.length ? [...itemsPor[r.id]].sort((a, b) => a.orden - b.orden) : [{ material_id: null, cantidad: r.cantidad, unidad: r.unidad, precio_unitario: r.precio_unitario, _legacy: r.material }];
    const obra = O[r.obra_destino_id];
    for (const i of its) {
      const cant = Number(i.cantidad) || 0, pu = Number(i.precio_unitario) || 0;
      out.push({
        seccion: "Materiales", remitoId: r.id, liquidado: !!r.liquidado, fecha: r.fecha, numero: r.numero_remito || "",
        cliente: obra?.cliente_id ? C[obra.cliente_id]?.nombre || "" : "",
        obra: obraLbl(r.obra_destino_id), detalle: CAT[i.material_id]?.nombre || i._legacy || "",
        cantidad: cant, unidad: i.unidad || "", precioUnitario: pu, importe: cant * pu,
        extra: { Movimiento: MOV[r.movimiento] || r.movimiento || "", Proveedor: P[r.proveedor_id]?.nombre || "", "Obra origen": obraLbl(r.obra_origen_id), "Sector de obra": r.sector_obra || "", Observaciones: r.observaciones || "" },
      });
    }
  }
  for (const r of maqRem) {
    const its = r.remito_maquina_items?.length ? [...r.remito_maquina_items].sort((a: Row, b: Row) => a.orden - b.orden) : [r];
    const obra = O[r.obra_id];
    const cliente = (r.cliente_id && C[r.cliente_id]?.nombre) || (obra?.cliente_id && C[obra.cliente_id]?.nombre) || "";
    for (const i of its) {
      const m = M[i.maquinaria_id];
      const cant = Number(i.cantidad) || 0, pu = Number(i.precio_unitario) || 0;
      out.push({
        seccion: "Máquinas", remitoId: r.id, liquidado: !!r.liquidado, fecha: r.fecha, numero: r.numero_remito || "", cliente, obra: obraLbl(r.obra_id),
        detalle: m ? [m.codigo, m.nombre].filter(Boolean).join(" - ") : "",
        cantidad: cant, unidad: i.unidad === "HORA" ? "Horas" : "Días", precioUnitario: pu, importe: cant * pu,
        extra: { Patente: m?.patente || "", Operador: i.operador || "", Observaciones: r.observaciones || "" },
      });
    }
  }
  return out;
}

/** Normaliza remitos de viajes (con sus ítems adicionales). */
export function renglonesViajes(remitos: RemitoWithRelations[], itemsMap: Record<string, RemitoItem[]>): RenglonRemito[] {
  const out: RenglonRemito[] = [];
  for (const r of remitos) {
    const base = {
      seccion: "Viajes" as const, remitoId: r.id, liquidado: !!r.liquidado, fecha: r.fecha, numero: r.remito_tercero || r.remito_local || r.numero || "",
      cliente: r.cliente || r.cliente_destino || "", obra: r.obra?.nombre || r.hasta || "",
    };
    const extra = { Desde: r.desde || "", Hasta: r.hasta || "", "Sector de obra": (r as any).sector_obra || "", Transporte: r.tipo_transporte || "", Patente: r.maquinaria?.patente || r.patente_tercero || "", "Cliente destino": r.cliente_destino || "", "Forma de pago": r.forma_pago || "" };
    out.push({ ...base, detalle: r.tipo_material || r.material || "", cantidad: r.cantidad || 0, unidad: r.unidad || "", precioUnitario: r.precio_unitario || 0, importe: r.precio_total || 0, viajes: r.cantidad_viajes || 1, extra });
    for (const it of itemsMap[r.id] || []) {
      out.push({ ...base, detalle: it.concepto, cantidad: it.cantidad, unidad: it.unidad, precioUnitario: it.precio_unitario, importe: it.precio_total, viajes: 0, extra });
    }
  }
  return out;
}

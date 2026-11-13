// Filtros y orden de Valores en Cartera / Buscar Valores (terminología CONTAD). Lógica pura, sin datos.
export interface ValorCartera {
  id: string; medio: string; importe: number; cheque_numero?: string | null; cheque_banco?: string | null;
  cheque_fecha_pago?: string | null; cheque_estado?: string | null; cheque_cuit?: string | null; cheque_librador?: string | null;
  pago?: { fecha?: string | null; recibo_numero?: string | null; tercero_id?: string | null;
    tercero?: { razon_social?: string | null; cuit?: string | null; doc_numero?: string | null; domicilio?: string | null; localidad?: string | null; provincia?: string | null } | null;
    asiento?: { numero?: number | null } | null } | null;
}
export type TipoValor = "fisicos" | "echeqs" | "ambos";
export type Incluir = "todos" | "cartera" | "endosados";
export interface FiltroCartera { desde?: string; hasta?: string; tipo: TipoValor; terceroId?: string; incluir: Incluir; }

export function filtrarCartera(rows: ValorCartera[], f: FiltroCartera): ValorCartera[] {
  return rows.filter((r) => {
    const fecha = r.pago?.fecha ?? "";
    if (f.desde && fecha < f.desde) return false;
    if (f.hasta && fecha > f.hasta) return false;
    if (f.tipo === "fisicos" && r.medio !== "cheque") return false;
    if (f.tipo === "echeqs" && r.medio !== "echeck") return false;
    if (f.terceroId && r.pago?.tercero_id !== f.terceroId) return false;
    if (f.incluir === "cartera" && r.cheque_estado !== "en_cartera") return false;
    if (f.incluir === "endosados" && r.cheque_estado !== "entregado") return false;
    return true;
  });
}

export interface Busqueda { numero?: string; banco?: string; importe?: string; vto?: string; }
const n = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export const busquedaVacia = (b: Busqueda) => !Object.values(b).some((v) => (v ?? "").trim());

export function buscarValores(rows: ValorCartera[], b: Busqueda): ValorCartera[] {
  if (busquedaVacia(b)) return [];
  const imp = b.importe?.trim() ? Number(b.importe.replace(/\./g, "").replace(",", ".")) : null;
  return rows.filter((r) =>
    (!b.numero?.trim() || n(r.cheque_numero ?? "").includes(n(b.numero))) &&
    (!b.banco?.trim() || n(r.cheque_banco ?? "").includes(n(b.banco))) &&
    (imp == null || Math.abs(Number(r.importe) - imp) < 0.005) &&
    (!b.vto || r.cheque_fecha_pago === b.vto));
}

export type ColOrden = "asiento" | "recibo" | "cliente" | "importe" | "numero" | "banco" | "ingreso" | "pago";
const clave: Record<ColOrden, (r: ValorCartera) => string | number> = {
  asiento: (r) => r.pago?.asiento?.numero ?? 0, recibo: (r) => r.pago?.recibo_numero ?? "",
  cliente: (r) => n(r.pago?.tercero?.razon_social ?? ""), importe: (r) => Number(r.importe),
  numero: (r) => r.cheque_numero ?? "", banco: (r) => n(r.cheque_banco ?? ""),
  ingreso: (r) => r.pago?.fecha ?? "", pago: (r) => r.cheque_fecha_pago ?? "",
};
export function ordenar(rows: ValorCartera[], col: ColOrden, asc = true): ValorCartera[] {
  const k = clave[col];
  return [...rows].sort((a, b) => { const x = k(a), y = k(b); const c = x < y ? -1 : x > y ? 1 : 0; return asc ? c : -c; });
}
export const totalValores = (rows: ValorCartera[]) => Math.round(rows.reduce((s, r) => s + Number(r.importe || 0), 0) * 100) / 100;

/** Controles comunes de remitos: totales, alertas y estado de liquidación. */
export interface FilaControl {
  id: string;
  cliente: string;
  obra: string;
  importe: number;
  liquidado?: boolean;
}
export type EstadoLiquidacion = "" | "pendiente" | "liquidado";
export type AlertaRemito = "" | "sin_precio" | "sin_obra";

export interface RemitoAgrupado { id: string; cliente: string; obra: string; importe: number; liquidado: boolean }
export interface ResumenControl {
  remitos: number;
  total: number;
  sinPrecio: number;
  sinObra: number;
  liquidados: number;
  porCliente: { nombre: string; total: number; remitos: number }[];
  porObra: { nombre: string; total: number; remitos: number }[];
}

/** Agrupa renglones por remito (un remito con varios renglones cuenta una vez). */
export function agruparRemitos(rows: FilaControl[]): RemitoAgrupado[] {
  const map = new Map<string, RemitoAgrupado>();
  for (const r of rows) {
    const g = map.get(r.id);
    if (g) {
      g.importe += Number(r.importe) || 0;
      if (!g.obra && r.obra) g.obra = r.obra;
      if (!g.cliente && r.cliente) g.cliente = r.cliente;
    } else {
      map.set(r.id, { id: r.id, cliente: r.cliente || "", obra: r.obra || "", importe: Number(r.importe) || 0, liquidado: !!r.liquidado });
    }
  }
  return [...map.values()];
}

export const sinPrecio = (r: { importe: number }) => !(Math.abs(Number(r.importe) || 0) > 0);
export const sinObra = (r: { obra: string }) => !String(r.obra || "").trim();

function top(rs: RemitoAgrupado[], key: "cliente" | "obra", n: number) {
  const m: Record<string, { nombre: string; total: number; remitos: number }> = {};
  for (const r of rs) {
    const nombre = r[key] || (key === "cliente" ? "Sin cliente" : "Sin obra");
    (m[nombre] ||= { nombre, total: 0, remitos: 0 });
    m[nombre].total += r.importe;
    m[nombre].remitos += 1;
  }
  return Object.values(m).sort((a, b) => b.total - a.total || b.remitos - a.remitos).slice(0, n);
}

export function resumenControl(rows: FilaControl[], n = 10): ResumenControl {
  const rs = agruparRemitos(rows);
  return {
    remitos: rs.length,
    total: rs.reduce((s, r) => s + r.importe, 0),
    sinPrecio: rs.filter(sinPrecio).length,
    sinObra: rs.filter(sinObra).length,
    liquidados: rs.filter((r) => r.liquidado).length,
    porCliente: top(rs, "cliente", n),
    porObra: top(rs, "obra", n),
  };
}

/** Ids de remitos que pasan el filtro de estado y alerta. */
export function idsFiltrados(rows: FilaControl[], estado: EstadoLiquidacion, alerta: AlertaRemito): Set<string> {
  return new Set(
    agruparRemitos(rows)
      .filter((r) => (estado === "liquidado" ? r.liquidado : estado === "pendiente" ? !r.liquidado : true))
      .filter((r) => (alerta === "sin_precio" ? sinPrecio(r) : alerta === "sin_obra" ? sinObra(r) : true))
      .map((r) => r.id)
  );
}

/** Mensaje de advertencia al guardar un remito sin precio o sin obra (null si está completo). */
export function advertenciaGuardado(d: { importe: number; obra: string }): string | null {
  const faltan = [sinPrecio(d) && "precio", sinObra(d) && "obra"].filter(Boolean);
  if (!faltan.length) return null;
  return `El remito queda sin ${faltan.join(" ni ")}. ¿Guardarlo igual?`;
}

/** Separa los remitos a liquidar: los ya liquidados se excluyen salvo que se pida incluirlos. */
export function paraLiquidar<T extends { liquidado?: boolean | null }>(rows: T[], incluirLiquidados: boolean) {
  const yaLiquidados = rows.filter((r) => !!r.liquidado);
  return { rows: incluirLiquidados ? rows : rows.filter((r) => !r.liquidado), yaLiquidados: yaLiquidados.length };
}

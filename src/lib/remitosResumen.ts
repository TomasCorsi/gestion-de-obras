import { normalizarNombre } from "@/lib/obraMatch";

export type SeccionRemito = "Viajes" | "Materiales" | "Máquinas";
export const SECCIONES: SeccionRemito[] = ["Viajes", "Materiales", "Máquinas"];

/** Renglón normalizado de cualquier tipo de remito (para exportar y liquidar). */
export interface RenglonRemito {
  seccion: SeccionRemito;
  remitoId: string;
  fecha: string | null; // ISO yyyy-mm-dd
  numero: string;
  cliente: string;
  obra: string;
  detalle: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  importe: number;
  viajes?: number;
  liquidado?: boolean;
  extra?: Record<string, string | number>;
}

export interface TotalesSeccion { seccion: SeccionRemito; remitos: number; renglones: number; importe: number; sinPrecio: number }
export interface FilaPivot { nombre: string; Viajes: number; Materiales: number; Máquinas: number; total: number }

export function enRango(fecha: string | null, desde?: string, hasta?: string) {
  if (!desde && !hasta) return true;
  if (!fecha) return false;
  return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
}

export function totalesPorSeccion(rows: RenglonRemito[]): TotalesSeccion[] {
  return SECCIONES.map((seccion) => {
    const rs = rows.filter((r) => r.seccion === seccion);
    return {
      seccion,
      remitos: new Set(rs.map((r) => r.remitoId)).size,
      renglones: rs.length,
      importe: rs.reduce((s, r) => s + (r.importe || 0), 0),
      sinPrecio: rs.filter((r) => !r.importe).length,
    };
  });
}

export function pivotPor(rows: RenglonRemito[], campo: "cliente" | "obra"): FilaPivot[] {
  const map = new Map<string, FilaPivot>();
  for (const r of rows) {
    const nombre = (r[campo] || "").trim() || "(Sin asignar)";
    const key = normalizarNombre(nombre);
    const f = map.get(key) || { nombre, Viajes: 0, Materiales: 0, Máquinas: 0, total: 0 };
    f[r.seccion] += r.importe || 0;
    f.total += r.importe || 0;
    map.set(key, f);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
}

/** Búsqueda por palabras (todas deben aparecer), sin acentos. */
export function coincideBusqueda(texto: string, q: string) {
  const t = normalizarNombre(texto);
  return normalizarNombre(q).split(" ").filter(Boolean).every((w) => t.includes(w));
}

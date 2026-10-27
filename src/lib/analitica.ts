// Reglas puras de imputación analítica (Fase 1B). La base de datos es la que valida;
// esto solo calcula lo que se muestra en pantalla.

export interface ImputacionNeta {
  importe_neto: number;
  obra_id?: string | null;
  obra_atribucion?: "economica" | "informativa" | null;
  maquinaria_id?: string | null;
  centro_id?: string | null;
}

/** Importe de la línea que todavía no está imputado (nunca negativo). */
export function saldoSinImputar(importeLinea: number, imputado: number[]): number {
  const suma = imputado.reduce((s, x) => s + Number(x || 0), 0);
  return Math.max(0, round2(Number(importeLinea || 0) - suma));
}

/** true si agregar `nuevo` superaría el importe de la línea. */
export function excedeLinea(importeLinea: number, imputado: number[], nuevo: number): boolean {
  const suma = imputado.reduce((s, x) => s + Number(x || 0), 0) + Number(nuevo || 0);
  return round2(suma) > round2(importeLinea);
}

/** Resultado por obra: solo cuenta la atribución económica. */
export function resultadoPorObra(rows: ImputacionNeta[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (!r.obra_id || r.obra_atribucion !== "economica") continue;
    out[r.obra_id] = round2((out[r.obra_id] ?? 0) + Number(r.importe_neto));
  }
  return out;
}

/** Resultado por máquina: suma todo lo imputado a la máquina. */
export function resultadoPorMaquina(rows: ImputacionNeta[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (!r.maquinaria_id) continue;
    out[r.maquinaria_id] = round2((out[r.maquinaria_id] ?? 0) + Number(r.importe_neto));
  }
  return out;
}

/** Total general: cada importe una sola vez. */
export function totalAnalitico(rows: ImputacionNeta[]): number {
  return round2(rows.reduce((s, r) => s + Number(r.importe_neto), 0));
}

function round2(n: number) { return Math.round(n * 100) / 100; }

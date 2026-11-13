export type Moneda = "ARS" | "USD";
export interface ValorCobro {
  medio: string;
  moneda: Moneda;
  importe_moneda: number;
  cotizacion: number;
  cuenta_id?: string;
  referencia?: string;
  cheque_banco?: string;
  cheque_numero?: string;
  cheque_fecha_pago?: string;
  cheque_librador?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Importe en pesos de un renglón (los pesos usan cotización 1). */
export function importeEnPesos(v: Pick<ValorCobro, "moneda" | "importe_moneda" | "cotizacion">): number {
  const cot = v.moneda === "ARS" ? 1 : Number(v.cotizacion || 0);
  return r2(Number(v.importe_moneda || 0) * cot);
}

export function totalCobro(valores: ValorCobro[]): number {
  return r2(valores.reduce((s, v) => s + importeEnPesos(v), 0));
}

/** Devuelve el primer error de carga o null si todos los renglones son válidos. */
export function errorValores(valores: ValorCobro[]): string | null {
  if (valores.length === 0) return "Cargá al menos un valor";
  for (const [i, v] of valores.entries()) {
    const n = i + 1;
    if (!(Number(v.importe_moneda) > 0)) return `Valor ${n}: falta el importe`;
    if (v.moneda === "USD" && !(Number(v.cotizacion) > 0)) return `Valor ${n}: falta la cotización del dólar`;
    if (v.medio === "cheque" && !v.cheque_numero?.trim()) return `Valor ${n}: falta el número de cheque`;
  }
  return null;
}

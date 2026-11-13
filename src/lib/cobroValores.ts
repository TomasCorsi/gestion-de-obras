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
  cheque_cuit?: string;
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
    if (esCheque(v.medio) && !v.cheque_numero?.trim()) return `Valor ${n}: falta el número de cheque`;
  }
  return null;
}

export const esCheque = (medio: string) => medio === "cheque" || medio === "echeck";

export type FormaPago = "cheque" | "efectivo" | "efvo_cheq" | "echeck" | "dep_cheq" | "dep_efvo" | "tarjeta" | "otro";
export const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: "cheque", label: "Cheque" },
  { value: "efectivo", label: "Efectivo" },
  { value: "efvo_cheq", label: "Efvo.+Cheq." },
  { value: "echeck", label: "e-check" },
  { value: "dep_cheq", label: "Dep.Bco.en Cheq." },
  { value: "dep_efvo", label: "Dep.Bco.en Efvo." },
  { value: "tarjeta", label: "Tarj. Créd." },
  { value: "otro", label: "Otros" },
];

/** Renglones iniciales según la forma de pago elegida (como en CONTAD). */
export function renglonesPorForma(forma: FormaPago, cotizacion = 1): ValorCobro[] {
  const base = (medio: string): ValorCobro => ({ medio, moneda: "ARS", importe_moneda: 0, cotizacion });
  switch (forma) {
    case "efvo_cheq": return [base("efectivo"), base("cheque")];
    case "dep_cheq": return [base("deposito")];
    case "dep_efvo": return [base("deposito")];
    case "tarjeta": return [base("tarjeta")];
    default: return [base(forma)];
  }
}

/** Diferencia entre la suma declarada ("Se recibe la suma de") y los renglones, en la moneda declarada. */
export function diferenciaDeclarada(valores: ValorCobro[], declarado: number | null | undefined, moneda: Moneda): number | null {
  if (!declarado) return null;
  const cargado = moneda === "ARS"
    ? totalCobro(valores)
    : r2(valores.filter((v) => v.moneda === "USD").reduce((s, v) => s + Number(v.importe_moneda || 0), 0));
  return r2(declarado - cargado);
}

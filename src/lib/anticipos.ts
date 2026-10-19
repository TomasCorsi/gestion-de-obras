export interface AnticipoCalc {
  tipo: string;
  valor?: number | null;
}

/** Importe de un anticipo: porcentaje sobre el subtotal o monto fijo. */
export const montoAnticipo = (a: AnticipoCalc, subtotal: number): number =>
  a.tipo === "porcentaje" ? (subtotal * (a.valor || 0)) / 100 : a.valor || 0;

/** Totales de cotización: los anticipos se descuentan del subtotal antes del IVA (21%). */
export const calcularTotalesCotizacion = (subtotal: number, anticipos: AnticipoCalc[]) => {
  const anticipoMonto = anticipos.reduce((s, a) => s + montoAnticipo(a, subtotal), 0);
  const baseImponible = subtotal - anticipoMonto;
  const iva = baseImponible * 0.21;
  return { anticipoMonto, baseImponible, iva, total: baseImponible + iva };
};

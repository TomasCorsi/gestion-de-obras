export type EstadoContable = "registrado" | "contabilizado" | "anulado";
export type EstadoFinanciero = "pendiente" | "parcial" | "cancelado" | null;

/**
 * Separa el estado contable (según el asiento) del financiero (según cobros/pagos).
 * Solo es "contabilizado" cuando el asiento está confirmado; un borrador sigue siendo "registrado".
 */
export function estadosComprobante(estadoCbte: string, estadoAsiento?: string | null): {
  contable: EstadoContable; financiero: EstadoFinanciero;
} {
  if (estadoCbte === "anulado") return { contable: "anulado", financiero: null };
  const contable: EstadoContable = estadoAsiento === "confirmado" ? "contabilizado" : "registrado";
  const financiero: EstadoFinanciero =
    estadoCbte === "pagado" ? "cancelado" : estadoCbte === "parcial" ? "parcial" : "pendiente";
  return { contable, financiero };
}

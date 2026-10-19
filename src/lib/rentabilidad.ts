/** Rentabilidad de obra: cotizado aprobado contra gasto acumulado. */
export const calcularRentabilidad = (cotizado: number, gastado: number) => {
  const beneficio = cotizado - gastado;
  return {
    beneficio,
    margen: cotizado > 0 ? (beneficio / cotizado) * 100 : 0,
    consumido: cotizado > 0 ? Math.min(100, (gastado / cotizado) * 100) : 0,
  };
};

/** Cobranzas: el anticipo se suma una sola vez; el saldo pendiente es solo sobre certificados. */
export const calcularCobranzas = (anticipoCobrado: number, totalCertificado: number, totalCobradoCertificados: number) => ({
  cobradoTotal: anticipoCobrado + totalCobradoCertificados,
  saldoPendiente: Math.max(0, totalCertificado - totalCobradoCertificados),
});

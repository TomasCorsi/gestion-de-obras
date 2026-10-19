/** Costo de una orden de compra para rentabilidad: siempre neto de IVA (subtotal), usa total solo si no hay subtotal. */
export const costoOrdenNeto = (o: { subtotal?: number | string | null; total?: number | string | null }): number => {
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  return o.subtotal != null ? n(o.subtotal) : n(o.total);
};

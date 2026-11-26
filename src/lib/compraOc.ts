export interface OcLinea {
  id: string; descripcion: string; articulo?: string | null; unidad: string;
  cantidad: number; precio_unitario: number; otros?: number;
}
export interface OcSnapshot { numero: string; moneda: string; items: OcLinea[] }
export interface FacturaOcLinea { oc_linea_id?: string | null; descripcion: string; cantidad: number; precio_unit: number }
export function compararOc(lineas: OcLinea[], factura: FacturaOcLinea[]) {
  const comparacion = lineas.map(l => {
    const renglones = factura.filter(i => i.oc_linea_id === l.id);
    const actual = renglones.reduce((s, i) => s + Number(i.cantidad), 0);
    const otros = Number(l.otros ?? 0);
    return { ...l, actual, otros, pendiente: Math.max(0, Number(l.cantidad) - otros - actual),
      excedida: actual + otros > Number(l.cantidad),
      precioDistinto: renglones.some(i => Number(i.precio_unit) !== Number(l.precio_unitario)) };
  });
  const extras = factura.filter(i => !i.oc_linea_id || !lineas.some(l => l.id === i.oc_linea_id));
  return { lineas: comparacion, extras, requiereAprobacion: extras.length > 0 || comparacion.some(l => l.excedida || l.precioDistinto) };
}
export function asociarOc(lineas: OcLinea[], factura: FacturaOcLinea[]) {
  const normalizar = (s: string) => s.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  return factura.map(i => {
    const candidatos = lineas.filter(l => [l.descripcion, [l.articulo, l.descripcion].filter(Boolean).join(' - ')].some(d => normalizar(d) === normalizar(i.descripcion)));
    return candidatos.length === 1 ? candidatos[0].id : null;
  });
}
import { describe, it, expect } from 'vitest';
import { compararOc, asociarOc, type OcLinea } from './compraOc';
const oc: OcLinea[] = [{id:'a',descripcion:'Arena',unidad:'m3',cantidad:10,precio_unitario:100,otros:0}];
describe('Factura contra OC', () => {
  it('una entrega parcial conserva el saldo y no exige aprobación', () => {
    const r = compararOc(oc,[{oc_linea_id:'a',descripcion:'Arena',cantidad:6,precio_unit:100}]);
    expect(r.lineas[0].pendiente).toBe(4); expect(r.requiereAprobacion).toBe(false);
  });
  it('precios diferentes requieren aprobación aunque sean menores', () => {
    expect(compararOc(oc,[{oc_linea_id:'a',descripcion:'Arena',cantidad:6,precio_unit:90}]).requiereAprobacion).toBe(true);
  });
  it('cuenta lo facturado en otras facturas para detectar exceso', () => {
    const r = compararOc([{...oc[0],otros:6}],[{oc_linea_id:'a',descripcion:'Arena',cantidad:5,precio_unit:100}]);
    expect(r.lineas[0].excedida).toBe(true); expect(r.requiereAprobacion).toBe(true);
  });
  it('suma varios renglones de la misma OC', () => {
    const r = compararOc(oc,[{oc_linea_id:'a',descripcion:'Arena',cantidad:6,precio_unit:100},{oc_linea_id:'a',descripcion:'Arena',cantidad:5,precio_unit:100}]);
    expect(r.lineas[0].actual).toBe(11); expect(r.requiereAprobacion).toBe(true);
  });
  it('los productos adicionales requieren aprobación', () => {
    expect(compararOc(oc,[{descripcion:'Piedra',cantidad:1,precio_unit:100}]).requiereAprobacion).toBe(true);
  });
  it('no asocia automáticamente descripciones ambiguas', () => {
    expect(asociarOc([...oc,{...oc[0],id:'b'}],[{descripcion:'Arena',cantidad:1,precio_unit:100}])).toEqual([null]);
  });
  it('una coincidencia exacta conserva la referencia de origen', () => {
    expect(asociarOc(oc,[{descripcion:' ARENA ',cantidad:1,precio_unit:100}])).toEqual(['a']);
  });
});
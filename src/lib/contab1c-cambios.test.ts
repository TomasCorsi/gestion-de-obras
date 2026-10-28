import { describe, it, expect } from "vitest";
import { cambiosPendientes, problemasCompatibilidad, permisosComprobante, type CabeceraCbte, type ItemCbteDraft } from "./contab1c";

const cab: CabeceraCbte = { tipo: "FA_CPA_A", punto_venta: 1, numero: 100, fecha: "2026-10-01", fecha_vto: null, tercero_id: "t1",
  obra_id: null, maquinaria_id: null, observaciones: null, perc_iva: 0, perc_iibb: 0, perc_otras: 0 };
const item: ItemCbteDraft = { id: "i1", descripcion: "Gasoil", cuenta_id: "c1", cantidad: 10, precio_unit: 100, alicuota_iva: 21, obra_id: null, maquinaria_id: null };
const guardado = { cab, items: [item] };

describe("cambios sin guardar del comprobante", () => {
  it("sin cambios no hay pendientes (null y '' equivalen)", () => {
    expect(cambiosPendientes(guardado, { cab: { ...cab, observaciones: "", fecha_vto: null }, items: [{ ...item }] })).toEqual([]);
  });
  it("cambio de fecha sin guardar marca cabecera", () => {
    expect(cambiosPendientes(guardado, { cab: { ...cab, fecha: "2026-10-02" }, items: [item] })).toEqual(["cabecera"]);
  });
  it("cambio de tipo sin guardar marca cabecera", () => {
    expect(cambiosPendientes(guardado, { cab: { ...cab, tipo: "FA_CPA_B" }, items: [item] })).toEqual(["cabecera"]);
  });
  it("cambio de número, punto de venta o tercero marca cabecera", () => {
    expect(cambiosPendientes(guardado, { cab: { ...cab, numero: 101 }, items: [item] })).toContain("cabecera");
    expect(cambiosPendientes(guardado, { cab: { ...cab, punto_venta: 2 }, items: [item] })).toContain("cabecera");
    expect(cambiosPendientes(guardado, { cab: { ...cab, tercero_id: "t2" }, items: [item] })).toContain("cabecera");
  });
  it("percepciones e ítems se detectan", () => {
    expect(cambiosPendientes(guardado, { cab: { ...cab, perc_iibb: 50 }, items: [item] })).toEqual(["percepciones"]);
    expect(cambiosPendientes(guardado, { cab, items: [{ ...item, cantidad: 11 }] })).toEqual(["items"]);
    expect(cambiosPendientes(guardado, { cab, items: [item, { ...item, id: undefined }] })).toEqual(["items"]);
    expect(cambiosPendientes(guardado, { cab, items: [] })).toEqual(["items"]);
  });
  it("con cambios pendientes se bloquean repartos, vínculos y asiento; sin cambios se rehabilitan", () => {
    const sucio = permisosComprobante({ tipo: "FA_CPA_A", etapa: "registrado", guardado: false, puedeCargar: true });
    expect([sucio.editarRepartos, sucio.vincular, sucio.generar]).toEqual([false, false, false]);
    const borr = permisosComprobante({ tipo: "FA_CPA_A", etapa: "asiento_borrador", guardado: false, puedeCargar: true });
    expect(borr.regenerar).toBe(false);
    const ok = permisosComprobante({ tipo: "FA_CPA_A", etapa: "registrado", guardado: true, puedeCargar: true });
    expect([ok.editarRepartos, ok.vincular, ok.generar]).toEqual([true, true, true]);
  });
  it("contabilizado y anulado siguen bloqueados aunque esté guardado", () => {
    for (const etapa of ["contabilizado", "anulado"] as const) {
      const p = permisosComprobante({ tipo: "FA_CPA_A", etapa, guardado: true, puedeCargar: true });
      expect([p.editarRepartos, p.vincular, p.generar, p.regenerar]).toEqual([false, false, false, false]);
    }
  });
});

describe("compatibilidad de repartos y vínculos", () => {
  const items = [{ id: "i1", neto: 1000 }];
  it("compatible cuando no superan el neto", () => {
    expect(problemasCompatibilidad({ tipo: "FA_CPA_A", items, repartos: [{ item_id: "i1", importe_efectivo: 1000 }],
      vinculos: [{ item_id: "i1", estado: "vigente", clase: "facturable", importe_vinculado: 1000 }] })).toEqual([]);
  });
  it("repartos que superan un neto reducido se rechazan", () => {
    expect(problemasCompatibilidad({ tipo: "FA_CPA_A", items: [{ id: "i1", neto: 800 }], repartos: [{ item_id: "i1", importe_efectivo: 1000 }], vinculos: [] }).length).toBe(1);
  });
  it("vínculo facturable mayor al neto se rechaza", () => {
    expect(problemasCompatibilidad({ tipo: "FA_CPA_A", items, repartos: [],
      vinculos: [{ item_id: "i1", estado: "vigente", clase: "facturable", importe_vinculado: 1200 }] }).length).toBe(1);
  });
  it("tipo cambiado a nota de crédito con vínculos vigentes es incompatible", () => {
    expect(problemasCompatibilidad({ tipo: "NC_CPA", items, repartos: [],
      vinculos: [{ item_id: "i1", estado: "vigente", clase: "trazabilidad", importe_vinculado: null }] })).toContain("Las notas de crédito no admiten vínculos operativos");
  });
  it("repartos de renglones eliminados son incompatibles", () => {
    expect(problemasCompatibilidad({ tipo: "FA_CPA_A", items, repartos: [{ item_id: "x", importe_efectivo: 10 }], vinculos: [] })).toContain("Hay repartos de renglones inexistentes");
  });
});

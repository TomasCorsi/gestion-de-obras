import { describe, it, expect } from "vitest";
import { importeEnPesos, totalCobro, errorValores, renglonesPorForma, diferenciaDeclarada, type ValorCobro } from "./cobroValores";

const v = (p: Partial<ValorCobro>): ValorCobro => ({ medio: "cheque", moneda: "ARS", importe_moneda: 0, cotizacion: 1, cheque_numero: "1", ...p });

describe("cobro con varios valores", () => {
  it("suma varios cheques en un solo cobro", () => {
    expect(totalCobro([v({ importe_moneda: 100000 }), v({ importe_moneda: 250000.5 }), v({ importe_moneda: 49999.5 })])).toBe(400000);
  });
  it("convierte dólares con la cotización y suma con pesos", () => {
    expect(importeEnPesos({ moneda: "USD", importe_moneda: 500, cotizacion: 1200 })).toBe(600000);
    expect(totalCobro([v({ medio: "efectivo", importe_moneda: 300000 }), v({ medio: "efectivo", moneda: "USD", importe_moneda: 500, cotizacion: 1200 })])).toBe(900000);
  });
  it("los pesos ignoran cualquier cotización cargada", () => {
    expect(importeEnPesos({ moneda: "ARS", importe_moneda: 1000, cotizacion: 1500 })).toBe(1000);
  });
  it("exige cotización para dólares y número para cheques", () => {
    expect(errorValores([v({ medio: "efectivo", moneda: "USD", importe_moneda: 10, cotizacion: 0 })])).toMatch(/cotización/);
    expect(errorValores([v({ importe_moneda: 10, cheque_numero: "" })])).toMatch(/número de cheque/);
    expect(errorValores([])).not.toBeNull();
    expect(errorValores([v({ importe_moneda: 10 })])).toBeNull();
  });

  it("Efvo.+Cheq. arma un renglón de efectivo y uno de cheque", () => {
    expect(renglonesPorForma("efvo_cheq").map((r) => r.medio)).toEqual(["efectivo", "cheque"]);
    expect(renglonesPorForma("echeck").map((r) => r.medio)).toEqual(["echeck"]);
  });
  it("e-check también exige número", () => {
    expect(errorValores([v({ medio: "echeck", importe_moneda: 10, cheque_numero: "" })])).toMatch(/número/);
  });
  it("avisa la diferencia con la suma declarada", () => {
    const vs = [v({ importe_moneda: 300000 }), v({ importe_moneda: 200000 })];
    expect(diferenciaDeclarada(vs, 600000, "ARS")).toBe(100000);
    expect(diferenciaDeclarada(vs, 500000, "ARS")).toBe(0);
    expect(diferenciaDeclarada([v({ moneda: "USD", importe_moneda: 400, cotizacion: 1000 })], 500, "USD")).toBe(100);
    expect(diferenciaDeclarada(vs, null, "ARS")).toBeNull();
  });
});

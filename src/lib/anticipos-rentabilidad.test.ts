import { describe, it, expect } from "vitest";
import { calcularTotalesCotizacion, montoAnticipo } from "./anticipos";
import { calcularCobranzas, calcularRentabilidad } from "./rentabilidad";

describe("anticipos en cotizaciones", () => {
  it("porcentaje con decimales: 12,5% de 1.000.000 = 125.000", () => {
    expect(montoAnticipo({ tipo: "porcentaje", valor: 12.5 }, 1_000_000)).toBe(125_000);
  });
  it("se descuenta del subtotal antes del IVA", () => {
    const t = calcularTotalesCotizacion(1_000_000, [{ tipo: "monto", valor: 200_000 }]);
    expect(t.baseImponible).toBe(800_000);
    expect(t.iva).toBe(168_000);
    expect(t.total).toBe(968_000);
  });
  it("varios anticipos se suman", () => {
    const t = calcularTotalesCotizacion(1_000_000, [
      { tipo: "porcentaje", valor: 10 },
      { tipo: "monto", valor: 50_000.5 },
    ]);
    expect(t.anticipoMonto).toBe(150_000.5);
  });
});

describe("rentabilidad de obra", () => {
  it("beneficio y margen", () => {
    const r = calcularRentabilidad(1_000_000, 750_000);
    expect(r.beneficio).toBe(250_000);
    expect(r.margen).toBe(25);
    expect(r.consumido).toBe(75);
  });
  it("el anticipo se suma una sola vez y no reduce el saldo de certificados", () => {
    const c = calcularCobranzas(300_000, 500_000, 200_000);
    expect(c.cobradoTotal).toBe(500_000);
    expect(c.saldoPendiente).toBe(300_000);
  });
});

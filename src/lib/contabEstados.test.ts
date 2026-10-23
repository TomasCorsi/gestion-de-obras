import { describe, expect, it } from "vitest";
import { estadosComprobante } from "./contabEstados";

describe("estados de comprobantes", () => {
  it("con asiento en borrador queda registrado, no contabilizado", () => {
    expect(estadosComprobante("confirmado", "borrador")).toEqual({ contable: "registrado", financiero: "pendiente" });
  });
  it("con asiento confirmado queda contabilizado", () => {
    expect(estadosComprobante("parcial", "confirmado")).toEqual({ contable: "contabilizado", financiero: "parcial" });
  });
  it("pagado se muestra como cancelado financieramente", () => {
    expect(estadosComprobante("pagado", "confirmado").financiero).toBe("cancelado");
  });
  it("anulado no tiene estado financiero", () => {
    expect(estadosComprobante("anulado", "revertido")).toEqual({ contable: "anulado", financiero: null });
  });
});

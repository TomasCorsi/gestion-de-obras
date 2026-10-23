import { describe, expect, it } from "vitest";
import { agruparBalance } from "./useContabPeriodos";

describe("balance de sumas y saldos", () => {
  it("suma debe y haber por cuenta y calcula saldo", () => {
    const caja = { codigo: "1.1.1.01", nombre: "Caja" };
    const vtas = { codigo: "4.1.1.01", nombre: "Ventas" };
    const r = agruparBalance([
      { debe: 100, haber: 0, cuenta: caja },
      { debe: 0, haber: 30, cuenta: caja },
      { debe: 0, haber: 100, cuenta: vtas },
    ]);
    expect(r).toEqual([
      { codigo: "1.1.1.01", nombre: "Caja", debe: 100, haber: 30, saldo: 70 },
      { codigo: "4.1.1.01", nombre: "Ventas", debe: 0, haber: 100, saldo: -100 },
    ]);
  });
});

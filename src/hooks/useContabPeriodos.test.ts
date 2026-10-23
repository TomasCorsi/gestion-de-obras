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

import { mayorConSaldo } from "./useContabPeriodos";
describe("libro mayor", () => {
  it("ordena por fecha y acumula saldo debe - haber", () => {
    const r = mayorConSaldo([
      { id: "b", debe: 0, haber: 40, orden: 1, asiento: { fecha: "2026-02-01", numero_ejercicio: 2, descripcion: "pago", estado: "confirmado" } },
      { id: "a", debe: 100, haber: 0, orden: 1, asiento: { fecha: "2026-01-10", numero_ejercicio: 1, descripcion: "venta", estado: "confirmado" } },
    ]);
    expect(r.map((f) => [f.id, f.saldo])).toEqual([["a", 100], ["b", 60]]);
  });
});

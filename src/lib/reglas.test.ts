import { describe, it, expect } from "vitest";
import { costoOrdenNeto } from "./costos";
import { calcularDiasBase } from "@/hooks/useVacaciones";

describe("costo de órdenes de compra", () => {
  it("usa el subtotal sin IVA", () => {
    expect(costoOrdenNeto({ subtotal: 1000, total: 1210 })).toBe(1000);
  });
  it("usa el total si no hay subtotal", () => {
    expect(costoOrdenNeto({ subtotal: null, total: 1210 })).toBe(1210);
  });
});

describe("vacaciones por antigüedad", () => {
  it("menos de 5 años: 14 días", () => expect(calcularDiasBase(4)).toBe(14));
  it("5 a 9 años: 21 días", () => expect(calcularDiasBase(5)).toBe(21));
  it("10 a 19 años: 28 días", () => expect(calcularDiasBase(10)).toBe(28));
  it("20 años o más: 35 días", () => expect(calcularDiasBase(20)).toBe(35));
});

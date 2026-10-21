import { describe, it, expect } from "vitest";
import { normalizarMaterial, totalRemitoMateriales } from "./materiales";

describe("nombres de materiales estandarizados", () => {
  it("hierro del 8, Hierro 8 y HIERRO Ø8 mm son el mismo material", () => {
    const k = normalizarMaterial("Hierro Ø 8 mm");
    expect(normalizarMaterial("hierro del 8")).toBe(k);
    expect(normalizarMaterial("Hierro 8")).toBe(k);
    expect(normalizarMaterial("HIERRO Ø8 mm")).toBe(k);
  });
  it("hierro del 8 y hierro del 12 son distintos", () => {
    expect(normalizarMaterial("hierro del 8")).not.toBe(normalizarMaterial("hierro del 12"));
  });
});

describe("total del remito de materiales", () => {
  it("suma cantidad por precio de cada renglón", () => {
    expect(totalRemitoMateriales([{ cantidad: 10, precio_unitario: 1500 }, { cantidad: 2.5, precio_unitario: 400 }])).toBe(16000);
  });
});

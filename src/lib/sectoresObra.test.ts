import { describe, it, expect } from "vitest";
import { sectoresDeObra, esSectorNuevo } from "./sectoresObra";

const rows = [
  { obra_id: "A", nombre: "Calle 1" },
  { obra_id: "A", nombre: "calle 1 " },
  { obra_id: "A", nombre: "Bloque B" },
  { obra_id: "B", nombre: "Pluvial" },
];

describe("sectores por obra", () => {
  it("muestra solo los sectores de la obra elegida, sin duplicados", () => {
    expect(sectoresDeObra(rows, "A")).toEqual(["Bloque B", "Calle 1"]);
    expect(sectoresDeObra(rows, "B")).toEqual(["Pluvial"]);
  });
  it("sin obra elegida no hay sectores", () => {
    expect(sectoresDeObra(rows, "")).toEqual([]);
  });
  it("detecta sector nuevo sin distinguir mayúsculas", () => {
    expect(esSectorNuevo(["Calle 1"], "CALLE 1")).toBe(false);
    expect(esSectorNuevo(["Calle 1"], "Calle 2")).toBe(true);
  });
});

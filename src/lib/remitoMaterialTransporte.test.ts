import { describe, expect, it } from "vitest";
import { datosTransporteMaterial, nombreTransporteMaterial } from "./remitoMaterialTransporte";

describe("Transporte de terceros en materiales", () => {
  it("guarda Tercero y la identificación del transporte", () => {
    expect(datosTransporteMaterial("tercero", "  Transporte Pérez  ")).toEqual({ transporte: "tercero", transporte_tercero: "Transporte Pérez" });
  });
  it("no guarda un tercero cuando se elige otra modalidad", () => {
    expect(datosTransporteMaterial("propio", "Transporte Pérez")).toEqual({ transporte: "propio", transporte_tercero: null });
    expect(datosTransporteMaterial("proveedor", "Transporte Pérez")).toEqual({ transporte: "proveedor", transporte_tercero: null });
  });
  it("incluye la identificación del tercero en listados y exportaciones", () => {
    expect(nombreTransporteMaterial({ transporte: "tercero", transporte_tercero: "Transporte Pérez" })).toBe("Tercero – Transporte Pérez");
  });
});
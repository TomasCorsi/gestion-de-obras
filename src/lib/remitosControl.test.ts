import { describe, expect, it } from "vitest";
import { advertenciaGuardado, idsFiltrados, paraLiquidar, resumenControl } from "./remitosControl";

const rows = [
  { id: "a", cliente: "ACME", obra: "101 - Ruta", importe: 1000, liquidado: true },
  { id: "a", cliente: "ACME", obra: "101 - Ruta", importe: 500, liquidado: true },
  { id: "b", cliente: "ACME", obra: "", importe: 0 },
  { id: "c", cliente: "Beta", obra: "102 - Puente", importe: 0 },
];

describe("controles de remitos", () => {
  it("cuenta un remito con varios renglones una sola vez y suma su total", () => {
    const r = resumenControl(rows);
    expect(r.remitos).toBe(3);
    expect(r.total).toBe(1500);
    expect(r.porCliente[0]).toEqual({ nombre: "ACME", total: 1500, remitos: 2 });
  });
  it("detecta remitos sin precio y sin obra", () => {
    const r = resumenControl(rows);
    expect(r.sinPrecio).toBe(2);
    expect(r.sinObra).toBe(1);
  });
  it("filtra por pendiente/liquidado y por alerta", () => {
    expect([...idsFiltrados(rows, "liquidado", "")]).toEqual(["a"]);
    expect([...idsFiltrados(rows, "pendiente", "")]).toEqual(["b", "c"]);
    expect([...idsFiltrados(rows, "", "sin_obra")]).toEqual(["b"]);
  });
  it("la liquidación excluye los ya liquidados salvo que se pida", () => {
    const x = [{ liquidado: true }, { liquidado: false }, {}];
    expect(paraLiquidar(x, false)).toEqual({ rows: [{ liquidado: false }, {}], yaLiquidados: 1 });
    expect(paraLiquidar(x, true).rows.length).toBe(3);
  });
  it("advierte al guardar sin precio u obra", () => {
    expect(advertenciaGuardado({ importe: 10, obra: "x" })).toBeNull();
    expect(advertenciaGuardado({ importe: 0, obra: "" })).toBe("El remito queda sin precio ni obra. ¿Guardarlo igual?");
  });
});

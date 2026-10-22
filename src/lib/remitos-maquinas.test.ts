import { describe, expect, it } from "vitest";
import { importeMaquinaLinea, nuevaMaquinaLinea, prepararMaquinaLineas, validarMaquinaLineas } from "./remitos-maquinas";

describe("Remito con varias máquinas", () => {
  it("conserva días y horas independientes en un único conjunto de renglones", () => {
    const lineas = [
      { ...nuevaMaquinaLinea(), maquinaria_id: "retro", cantidad: "1.5", precio_unitario: "100" },
      { ...nuevaMaquinaLinea(), maquinaria_id: "moto", unidad: "HORA", cantidad: "4", precio_unitario: "25" },
    ];
    expect(validarMaquinaLineas(lineas)).toBeNull();
    expect(prepararMaquinaLineas(lineas)).toEqual([
      { maquinaria_id: "retro", unidad: "DIA", cantidad: 1.5, precio_unitario: 100, operador: null, observaciones: null },
      { maquinaria_id: "moto", unidad: "HORA", cantidad: 4, precio_unitario: 25, operador: null, observaciones: null },
    ]);
    expect(lineas.reduce((sum, linea) => sum + importeMaquinaLinea(linea), 0)).toBe(250);
  });
  it("acepta medio día con coma decimal", () => {
    const linea = { ...nuevaMaquinaLinea(), maquinaria_id: "retro", cantidad: "0,5", precio_unitario: "200" };
    expect(prepararMaquinaLineas([linea])[0].cantidad).toBe(0.5);
    expect(importeMaquinaLinea(linea)).toBe(100);
  });
  it("rechaza un renglón sin máquina sin ignorar los demás", () => {
    expect(validarMaquinaLineas([{ ...nuevaMaquinaLinea(), maquinaria_id: "retro" }, nuevaMaquinaLinea()])).toBe("Renglón 2: seleccioná la máquina");
  });
  it("no permite remitos sin renglones", () => {
    expect(validarMaquinaLineas([])).not.toBeNull();
  });
});
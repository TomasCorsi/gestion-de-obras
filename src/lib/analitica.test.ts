import { describe, it, expect } from "vitest";
import { saldoSinImputar, excedeLinea, resultadoPorObra, resultadoPorMaquina, totalAnalitico } from "./analitica";

describe("imputación analítica", () => {
  it("calcula el saldo sin imputar de una línea", () => {
    expect(saldoSinImputar(1000, [600, 250])).toBe(150);
    expect(saldoSinImputar(1000, [600, 400])).toBe(0);
  });

  it("detecta cuando una imputación supera la línea", () => {
    expect(excedeLinea(1000, [600, 400], 0.01)).toBe(true);
    expect(excedeLinea(1000, [600], 400)).toBe(false);
  });

  it("máquina trabajando en obra: un solo importe, cuenta en la obra solo si es económica", () => {
    const rows = [
      { importe_neto: 600, obra_id: "O1", obra_atribucion: "economica" as const },
      { importe_neto: 400, obra_id: "O1", obra_atribucion: "economica" as const, maquinaria_id: "M1" },
      { importe_neto: 300, obra_id: "O2", obra_atribucion: "informativa" as const, maquinaria_id: "M1" },
    ];
    expect(resultadoPorObra(rows)).toEqual({ O1: 1000 });
    expect(resultadoPorMaquina(rows)).toEqual({ M1: 700 });
    expect(totalAnalitico(rows)).toBe(1300);
  });

  it("una reversa deja el neto en cero sin duplicar", () => {
    const rows = [
      { importe_neto: 400, obra_id: "O1", obra_atribucion: "economica" as const, maquinaria_id: "M1" },
      { importe_neto: -400, obra_id: "O1", obra_atribucion: "economica" as const, maquinaria_id: "M1" },
    ];
    expect(resultadoPorObra(rows)).toEqual({ O1: 0 });
    expect(resultadoPorMaquina(rows)).toEqual({ M1: 0 });
    expect(totalAnalitico(rows)).toBe(0);
  });
});

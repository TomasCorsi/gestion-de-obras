import { describe, it, expect } from "vitest";
import { cuentasConNivel, esCuentaDisponibilidad } from "./planCuentas";

describe("plan de cuentas CONTAD", () => {
  const c = [
    { id: "a", parent_id: null, activa: true },
    { id: "b", parent_id: "a", activa: true },
    { id: "c", parent_id: "b", activa: true },
    { id: "old", parent_id: null, activa: false },
  ];
  it("oculta cuentas provisorias inactivas", () => {
    expect(cuentasConNivel(c).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("calcula el nivel por cuenta madre", () => {
    expect(cuentasConNivel(c).map((x) => x.nivel)).toEqual([0, 1, 2]);
  });
  it("caja y bancos son las cuentas 111xxx", () => {
    expect(esCuentaDisponibilidad("111101")).toBe(true);
    expect(esCuentaDisponibilidad("111201")).toBe(true);
    expect(esCuentaDisponibilidad("113101")).toBe(false);
    expect(esCuentaDisponibilidad("1.1.1.01")).toBe(false);
  });
});

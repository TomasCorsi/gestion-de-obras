import { describe, expect, it } from "vitest";
import { errorGuardarSubcentro, proponerCodigoSubcentro } from "./subcentroCodigo";

describe("códigos de subcentros sugeridos", () => {
  it("distingue obras sin número que empiezan con Edificio", () => {
    expect(proponerCodigoSubcentro("OBRAS", "Edificio Belgrano", [])).toBe("OBRAS-EDIFICIO-BELGRANO");
    expect(proponerCodigoSubcentro("OBRAS", "Edificio Palermo", [])).toBe("OBRAS-EDIFICIO-PALERMO");
  });
  it("distingue máquinas sin código que comparten la primera palabra", () => {
    expect(proponerCodigoSubcentro("MAQ", "Excavadora Norte", [])).not.toBe(proponerCodigoSubcentro("MAQ", "Excavadora Sur", []));
  });
  it("evita códigos existentes y nombres idénticos", () => {
    expect(proponerCodigoSubcentro("OBRAS", "Edificio Belgrano", ["OBRAS-EDIFICIO-BELGRANO", "OBRAS-EDIFICIO-BELGRANO-2"])).toBe("OBRAS-EDIFICIO-BELGRANO-3");
  });
  it("reserva espacio para sufijos incluso si el nombre se trunca", () => {
    const primero = proponerCodigoSubcentro("OBRAS", "Edificio con un nombre extremadamente largo Norte", []);
    const segundo = proponerCodigoSubcentro("OBRAS", "Edificio con un nombre extremadamente largo Sur", [primero]);
    expect(segundo).not.toBe(primero);
    expect(segundo).toHaveLength(30);
    expect(segundo.endsWith("-2")).toBe(true);
    expect(segundo).toMatch(/^[A-Z0-9][A-Z0-9._-]{0,29}$/);
  });
  it("normaliza acentos sin generar colisiones", () => {
    expect(proponerCodigoSubcentro("MAQ", "Máquina Ñandú", ["MAQ-MAQUINA-NANDU"])).toBe("MAQ-MAQUINA-NANDU-2");
  });
});
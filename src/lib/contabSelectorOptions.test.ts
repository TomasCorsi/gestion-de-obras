import { describe, expect, it } from "vitest";
import { opcionObra, opcionMaquina } from "./contabSelectorOptions";

describe("búsqueda de recursos de Contabilidad", () => {
  it("permite buscar obras por número y nombre manteniendo su ID", () => {
    const option = opcionObra({ id: "obra-id", numero: "302", nombre: "Edificio Belgrano" });
    expect(option.value).toBe("obra-id");
    expect(option.searchValue).toContain("302");
    expect(option.searchValue).toContain("Edificio Belgrano");
  });
  it("permite buscar máquinas por número y nombre manteniendo su ID", () => {
    const option = opcionMaquina({ id: "maquina-id", codigo: "M-27", nombre: "Excavadora", patente: "ABC123" });
    expect(option.value).toBe("maquina-id");
    expect(option.searchValue).toContain("M-27");
    expect(option.searchValue).toContain("Excavadora");
    expect(option.searchValue).toContain("ABC123");
  });
  it("conserva búsqueda por nombre cuando no existe número", () => {
    expect(opcionObra({ id: "o", numero: null, nombre: "Palermo" }).searchValue).toBe("Palermo");
    expect(opcionMaquina({ id: "m", codigo: null, nombre: "Pala" }).searchValue).toBe("Pala");
  });
});
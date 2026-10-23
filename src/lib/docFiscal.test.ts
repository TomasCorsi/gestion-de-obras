import { describe, expect, it } from "vitest";
import { cuitValido, docValido } from "./docFiscal";

describe("validación de identificación fiscal", () => {
  it("acepta CUIT con dígito verificador correcto (con o sin guiones)", () => {
    expect(docValido("CUIT", "20-12345678-6")).toBe(true);
  });
  it("rechaza CUIT con dígito verificador incorrecto", () => {
    expect(cuitValido("20123456787")).toBe(false);
  });
  it("rechaza CUIT con prefijo inválido", () => {
    expect(cuitValido("99123456786")).toBe(false);
  });
  it("DNI exige 7 u 8 dígitos", () => {
    expect(docValido("DNI", "123456")).toBe(false);
    expect(docValido("DNI", "12345678")).toBe(true);
  });
  it("sin identificar no lleva número", () => {
    expect(docValido("SIN", "")).toBe(true);
    expect(docValido("SIN", "123")).toBe(false);
  });
});

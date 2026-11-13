import { describe, it, expect } from "vitest";
import { filtrarCartera, buscarValores, ordenar, totalValores, type ValorCartera } from "./valoresCartera";

const rows: ValorCartera[] = [
  { id: "a", medio: "cheque", importe: 1000, cheque_numero: "123", cheque_banco: "Galicia", cheque_estado: "en_cartera", cheque_fecha_pago: "2026-12-01", pago: { fecha: "2026-11-10", tercero_id: "t1" } },
  { id: "b", medio: "echeck", importe: 500.5, cheque_numero: "999", cheque_banco: "Nación", cheque_estado: "entregado", pago: { fecha: "2026-11-20", tercero_id: "t2" } },
  { id: "c", medio: "cheque", importe: 200, cheque_numero: "456", cheque_banco: "Galicia", cheque_estado: "depositado", pago: { fecha: "2026-10-01", tercero_id: "t1" } },
];

describe("valores en cartera", () => {
  it("por defecto solo en cartera", () => expect(filtrarCartera(rows, { tipo: "ambos", incluir: "cartera" }).map((r) => r.id)).toEqual(["a"]));
  it("endosados = entregados a proveedor", () => expect(filtrarCartera(rows, { tipo: "ambos", incluir: "endosados" }).map((r) => r.id)).toEqual(["b"]));
  it("tipo físicos excluye echeqs", () => expect(filtrarCartera(rows, { tipo: "fisicos", incluir: "todos" }).map((r) => r.id)).toEqual(["a", "c"]));
  it("período por fecha de ingreso y cliente", () =>
    expect(filtrarCartera(rows, { tipo: "ambos", incluir: "todos", desde: "2026-11-01", hasta: "2026-11-30", terceroId: "t1" }).map((r) => r.id)).toEqual(["a"]));
  it("búsqueda vacía no devuelve nada", () => expect(buscarValores(rows, {})).toEqual([]));
  it("busca por banco sin acentos e importe exacto", () => {
    expect(buscarValores(rows, { banco: "nacion" }).map((r) => r.id)).toEqual(["b"]);
    expect(buscarValores(rows, { importe: "500,50" }).map((r) => r.id)).toEqual(["b"]);
  });
  it("ordena por importe y totaliza", () => {
    expect(ordenar(rows, "importe").map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(totalValores(rows)).toBe(1700.5);
  });
});

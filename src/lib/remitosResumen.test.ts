import { describe, expect, it } from "vitest";
import { coincideBusqueda, enRango, pivotPor, totalesPorSeccion, type RenglonRemito } from "./remitosResumen";

const r = (p: Partial<RenglonRemito>): RenglonRemito => ({ seccion: "Viajes", remitoId: "1", fecha: "2026-10-01", numero: "", cliente: "", obra: "", detalle: "", cantidad: 1, unidad: "UN", precioUnitario: 0, importe: 0, ...p });

describe("resumen de remitos", () => {
  const rows = [
    r({ seccion: "Viajes", remitoId: "v1", cliente: "Acme", obra: "Ruta 3", importe: 100 }),
    r({ seccion: "Viajes", remitoId: "v1", cliente: "Acme", obra: "Ruta 3", importe: 50 }),
    r({ seccion: "Materiales", remitoId: "m1", cliente: "acme", obra: "Ruta 3", importe: 30 }),
    r({ seccion: "Máquinas", remitoId: "q1", cliente: "Beta", obra: "Puerto", importe: 0 }),
  ];
  it("totaliza por sección contando remitos distintos y renglones sin precio", () => {
    const t = totalesPorSeccion(rows);
    expect(t.find((x) => x.seccion === "Viajes")).toMatchObject({ remitos: 1, renglones: 2, importe: 150 });
    expect(t.find((x) => x.seccion === "Máquinas")).toMatchObject({ remitos: 1, sinPrecio: 1, importe: 0 });
  });
  it("agrupa por cliente sumando los tres tipos (sin distinguir mayúsculas)", () => {
    const p = pivotPor(rows, "cliente");
    expect(p[0]).toMatchObject({ Viajes: 150, Materiales: 30, Máquinas: 0, total: 180 });
    expect(p).toHaveLength(2);
  });
  it("filtra por rango de fechas", () => {
    expect(enRango("2026-10-01", "2026-10-01", "2026-10-31")).toBe(true);
    expect(enRango("2026-09-30", "2026-10-01")).toBe(false);
    expect(enRango(null)).toBe(true);
  });
  it("encuentra obras por número y máquinas por código", () => {
    expect(coincideBusqueda("125 - Pavimento Ruta 3", "125")).toBe(true);
    expect(coincideBusqueda("RET-04 - Retroexcavadora - AB123CD", "ret-04 retro")).toBe(true);
    expect(coincideBusqueda("Cemento", "hierro")).toBe(false);
  });
});

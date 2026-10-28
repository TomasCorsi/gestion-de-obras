import { describe, expect, it, vi } from "vitest";
import { aplicarFiltroId, destinoProveedor } from "./contabProveedorNav";

describe("navegación desde el maestro de proveedores", () => {
  it("órdenes usa proveedor_id, nunca un nombre", () => {
    expect(destinoProveedor("ordenes", "proveedor-123")).toBe("/contabilidad?m=compras&s=ordenes&proveedor_id=proveedor-123");
  });
  it("comprobantes usa el tercero vinculado, no el ID del proveedor", () => {
    expect(destinoProveedor("comprobantes", "proveedor-123", "fiscal-456")).toBe("/contabilidad?m=compras&s=comprobantes&tercero_id=fiscal-456");
  });
  it("sin ficha fiscal no navega a una lista vacía o sin filtro", () => {
    expect(destinoProveedor("comprobantes", "proveedor-123", null)).toBeNull();
  });
  it("consulta órdenes por igualdad exacta de proveedor_id", () => {
    const query = { eq: vi.fn().mockReturnThis() };
    aplicarFiltroId(query, "proveedor_id", "proveedor-123");
    expect(query.eq).toHaveBeenCalledExactlyOnceWith("proveedor_id", "proveedor-123");
  });
  it("consulta comprobantes por igualdad exacta de tercero_id", () => {
    const query = { eq: vi.fn().mockReturnThis() };
    aplicarFiltroId(query, "tercero_id", "fiscal-456");
    expect(query.eq).toHaveBeenCalledExactlyOnceWith("tercero_id", "fiscal-456");
  });
  it("sin filtro mantiene el listado completo", () => {
    const query = { eq: vi.fn().mockReturnThis() };
    expect(aplicarFiltroId(query, "proveedor_id")).toBe(query);
    expect(query.eq).not.toHaveBeenCalled();
  });
});
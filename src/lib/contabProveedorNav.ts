/** Supplier names are display-only; navigation and queries always use linked IDs. */
export function destinoProveedor(seccion: "ordenes" | "comprobantes", proveedorId: string, terceroId?: string | null): string | null {
  if (seccion === "comprobantes" && !terceroId) return null;
  const params = new URLSearchParams({ m: "compras", s: seccion });
  params.set(seccion === "ordenes" ? "proveedor_id" : "tercero_id", seccion === "ordenes" ? proveedorId : terceroId ?? "");
  return `/contabilidad?${params}`;
}

export function aplicarFiltroId<T extends { eq: (campo: string, valor: string) => T }>(query: T, campo: "proveedor_id" | "tercero_id", id?: string): T {
  return id ? query.eq(campo, id) : query;
}
interface TransporteMaterial {
  transporte?: string;
  transporte_tercero?: string | null;
  cantidad_viajes?: number | null;
}

export function datosTransporteMaterial(transporte: string, tercero: string) {
  return {
    transporte: transporte === "propio" || transporte === "tercero" ? transporte : "proveedor",
    transporte_tercero: transporte === "tercero" ? tercero.trim() || null : null,
  };
}

export function nombreTransporteMaterial(remito: TransporteMaterial, camion?: string) {
  if (remito.transporte === "tercero") {
    return ["Tercero", remito.transporte_tercero].filter(Boolean).join(" – ");
  }
  if (remito.transporte === "propio") {
    const viajes = remito.cantidad_viajes;
    return `Propio – ${camion || "camión"}${viajes ? ` (${viajes} viaje${viajes > 1 ? "s" : ""})` : ""}`;
  }
  return "Proveedor";
}
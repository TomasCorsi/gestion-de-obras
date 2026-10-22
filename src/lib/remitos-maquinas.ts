export interface MaquinaLineaInput {
  maquinaria_id: string;
  unidad: string;
  cantidad: string;
  precio_unitario: string;
  operador: string;
  observaciones: string;
}

export const nuevaMaquinaLinea = (): MaquinaLineaInput => ({
  maquinaria_id: "", unidad: "DIA", cantidad: "1", precio_unitario: "", operador: "", observaciones: "",
});

export function numeroMaquina(value: string): number {
  const cleaned = value.trim().replace(",", ".");
  return cleaned === "" ? 0 : Number(cleaned);
}

export function validarMaquinaLineas(lineas: MaquinaLineaInput[]): string | null {
  if (!lineas.length) return "Agregá al menos una máquina";
  for (const [index, linea] of lineas.entries()) {
    const prefix = `Renglón ${index + 1}: `;
    if (!linea.maquinaria_id) return prefix + "seleccioná la máquina";
    if (!["DIA", "HORA"].includes(linea.unidad)) return prefix + "seleccioná días u horas";
    if (!Number.isFinite(numeroMaquina(linea.cantidad)) || numeroMaquina(linea.cantidad) <= 0) return prefix + "la cantidad debe ser mayor a 0";
    if (!Number.isFinite(numeroMaquina(linea.precio_unitario)) || numeroMaquina(linea.precio_unitario) < 0) return prefix + "el precio no puede ser negativo ni inválido";
  }
  return null;
}

export function importeMaquinaLinea(linea: MaquinaLineaInput): number {
  const importe = numeroMaquina(linea.cantidad) * numeroMaquina(linea.precio_unitario);
  return Number.isFinite(importe) ? importe : 0;
}

export function prepararMaquinaLineas(lineas: MaquinaLineaInput[]) {
  return lineas.map(linea => ({
    maquinaria_id: linea.maquinaria_id,
    unidad: linea.unidad,
    cantidad: numeroMaquina(linea.cantidad),
    precio_unitario: numeroMaquina(linea.precio_unitario),
    operador: linea.operador.trim() || null,
    observaciones: linea.observaciones.trim() || null,
  }));
}
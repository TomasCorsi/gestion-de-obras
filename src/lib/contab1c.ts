// Reglas de pantalla de la Fase 1C. La validación definitiva siempre la hace la base.

export type EtapaCbte = "registrado" | "asiento_borrador" | "contabilizado" | "anulado";

export function etapaComprobante(estadoCbte: string, asientoId: string | null | undefined, estadoAsiento?: string | null): EtapaCbte {
  if (estadoCbte === "anulado") return "anulado";
  if (!asientoId) return "registrado";
  if (estadoAsiento === "confirmado" || estadoAsiento === "revertido") return "contabilizado";
  return "asiento_borrador";
}

export const ETAPA_LABEL: Record<EtapaCbte, string> = {
  registrado: "Registrado",
  asiento_borrador: "Asiento borrador",
  contabilizado: "Contabilizado",
  anulado: "Anulado",
};

export const esNotaCredito = (tipo: string) => tipo.startsWith("NC");

export interface PermisosCbte {
  editarItems: boolean;
  editarRepartos: boolean;
  vincular: boolean;
  motivoSinVinculos: string | null;
  generar: boolean;
  regenerar: boolean;
}

/** Qué se puede hacer en pantalla según el estado. `guardado` = el comprobante y sus ítems ya existen sin cambios pendientes. */
export function permisosComprobante(p: { tipo: string; etapa: EtapaCbte; guardado: boolean; puedeCargar: boolean }): PermisosCbte {
  const abierto = p.etapa === "registrado" || p.etapa === "asiento_borrador";
  const base = p.puedeCargar && abierto && p.guardado;
  const nc = esNotaCredito(p.tipo);
  return {
    editarItems: p.puedeCargar && p.etapa === "registrado",
    editarRepartos: base,
    vincular: base && !nc,
    motivoSinVinculos: nc
      ? "Disponible cuando exista la vinculación controlada con la factura original"
      : !abierto ? "El comprobante está contabilizado o anulado"
      : !p.guardado ? "Guardá el comprobante antes de vincular" : null,
    generar: base && p.etapa === "registrado",
    regenerar: base && p.etapa === "asiento_borrador",
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Saldo pendiente de repartir de un ítem, usando los importes efectivos que devuelve la base. */
export const saldoItem = (neto: number, efectivos: number[]) => r2(Number(neto) - efectivos.reduce((a, b) => a + Number(b), 0));

/** Saldo facturable de un documento operativo; null si el documento no tiene importe propio. */
export function saldoDocumento(referencia: number | null | undefined, facturado: number | null | undefined): number | null {
  if (referencia == null || Number(referencia) <= 0) return null;
  return r2(Number(referencia) - Number(facturado ?? 0));
}

/** Documento elegible como facturable: con importe propio requiere saldo; sin importe, que no esté facturado. */
export function docFacturable(referencia: number | null | undefined, facturado: number | null | undefined) {
  const s = saldoDocumento(referencia, facturado);
  return s == null ? Number(facturado ?? 0) <= 0 : s > 0;
}

export type DocTipo =
  | "orden_compra" | "orden_compra_item" | "mantenimiento" | "carga_combustible" | "movimiento_stock"
  | "certificado" | "remito_maquinas" | "remito_materiales" | "otro_gasto";

export const DOC_LABEL: Record<DocTipo, string> = {
  orden_compra: "Orden de compra (cabecera)",
  orden_compra_item: "Renglón de orden de compra",
  mantenimiento: "Mantenimiento",
  carga_combustible: "Carga de combustible",
  movimiento_stock: "Movimiento de stock",
  certificado: "Certificado",
  remito_maquinas: "Remito de máquinas",
  remito_materiales: "Remito de materiales",
  otro_gasto: "Otro gasto",
};

/** Ventas solo certificados; compras solo documentos de costo (igual que la base). */
export const docTiposPara = (esVenta: boolean): DocTipo[] =>
  esVenta ? ["certificado"]
    : ["orden_compra_item", "orden_compra", "remito_materiales", "remito_maquinas", "mantenimiento", "carga_combustible", "movimiento_stock", "otro_gasto"];

/** La cabecera de OC solo admite trazabilidad. */
export const admiteFacturable = (t: DocTipo) => t !== "orden_compra";

/** Regla 1B (corregida en 0030): la suma de imputaciones originales no puede superar el importe de la línea. */
export const imputacionesDentroDeLinea = (tope: number, importes: number[]) =>
  r2(importes.reduce((a, b) => a + Number(b), 0)) <= r2(tope);

const ERRORES: [RegExp, string][] = [
  [/supera el neto del ítem/i, "El reparto supera el neto del ítem."],
  [/Saldo facturable insuficiente/i, "El documento no tiene saldo facturable suficiente."],
  [/ya está facturado/i, "Ese documento ya está facturado en otro comprobante."],
  [/Vinculado por ítem/i, "Lo vinculado como facturable supera el neto del ítem."],
  [/notas de crédito todavía no admiten/i, "Las notas de crédito todavía no admiten vínculos operativos."],
  [/Certificados solo en ventas/i, "Certificados solo en ventas; documentos de costo solo en compras."],
  [/reparto es inmutable|no se regenera/i, "El asiento ya está contabilizado: no se puede modificar."],
  [/Comprobante anulado/i, "El comprobante está anulado."],
  [/fuera de vigencia/i, "El subcentro está inactivo o fuera de vigencia para la fecha del comprobante."],
  [/no coincide con el subcentro/i, "La obra o máquina no coincide con la del subcentro."],
  [/ir_uq|duplicate key.*repart/i, "Ese subcentro ya tiene un reparto en este ítem."],
  [/contab_vinc_uq|duplicate key.*vinc/i, "Ese documento ya está vinculado a este ítem."],
  [/violates foreign key.*contab_vinculos|vinculos_operativos.*foreign/i, "No se puede quitar un ítem que tiene vínculos: anulá los vínculos primero."],
  [/no tiene ítems/i, "El comprobante no tiene ítems."],
  [/no coinciden con el total/i, "Ítems + IVA + percepciones no coinciden con el total."],
  [/Falta configurar cuentas/i, "Faltan cuentas en la configuración contable."],
  [/No autorizado|row-level security|permission denied/i, "No tenés permiso para esta operación."],
];

export function traducirError(msg: string | null | undefined): string {
  const m = String(msg ?? "Error desconocido");
  for (const [re, t] of ERRORES) if (re.test(m)) return t;
  return m;
}

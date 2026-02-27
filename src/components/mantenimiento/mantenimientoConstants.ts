export const CHECKLIST_CAMBIO_ITEMS = [
  { key: "aceite_motor", label: "Aceite de motor" },
  { key: "filtro_aceite_motor", label: "Filtro de aceite de motor" },
  { key: "filtro_combustible", label: "Filtro de combustible" },
  { key: "filtro_aire_secundario", label: "Filtro de aire secundario" },
  { key: "filtro_aire_primario", label: "Filtro de aire primario" },
  { key: "filtro_convertidor", label: "Filtro convertidor" },
] as const;

export const CHECKLIST_CHEQUEO_ITEMS = [
  { key: "nivel_aceite_hidraulico", label: "Nivel de aceite hidráulico" },
  { key: "nivel_liquido_frenos", label: "Nivel de líquido de frenos" },
  { key: "nivel_agua_refrigerante", label: "Nivel de agua refrigerante" },
  { key: "tension_correa", label: "Tensión de correa" },
  { key: "funcionamiento_relojes", label: "Funcionamiento de relojes" },
  { key: "engrase_diario", label: "Engrase diario" },
  { key: "aceite_diferencial", label: "Aceite diferencial trasero y delantero" },
  { key: "aceite_reductores", label: "Aceite de reductores" },
  { key: "eje_bomba_agua", label: "Eje de bomba de agua" },
  { key: "cilindro_hidraulico", label: "Cilindro hidráulico" },
  { key: "soldaduras_equipo", label: "Soldaduras del equipo" },
  { key: "direccion", label: "Dirección" },
  { key: "frenos", label: "Frenos" },
  { key: "partes_electricas", label: "Partes eléctricas" },
  { key: "perdida_aceite_motor", label: "Pérdida de aceite de motor" },
  { key: "funciones_convertidor", label: "Funciones del convertidor de transmisión" },
  { key: "estado_toma_aire", label: "Estado de toma de aire" },
  { key: "tornillos_flojos", label: "Tornillos flojos" },
  { key: "chequeos_radiadores", label: "Chequeos de radiadores" },
] as const;

export type ChecklistCambio = Record<string, boolean>;
export type ChecklistChequeo = Record<string, boolean>;

export function emptyChecklistCambio(): ChecklistCambio {
  return Object.fromEntries(CHECKLIST_CAMBIO_ITEMS.map(i => [i.key, false]));
}

export function emptyChecklistChequeo(): ChecklistChequeo {
  return Object.fromEntries(CHECKLIST_CHEQUEO_ITEMS.map(i => [i.key, false]));
}

export const ESTADO_CONFIG = {
  pendiente: { label: "Pendiente", emoji: "📋", className: "bg-muted text-muted-foreground border-border" },
  en_proceso: { label: "En Proceso", emoji: "⚙️", className: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  completado: { label: "Finalizado", emoji: "✅", className: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" },
} as const;

export const TIPO_CONFIG = {
  preventivo: { label: "Service", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  correctivo: { label: "Reparación", className: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  emergencia: { label: "Emergencia", className: "bg-destructive/20 text-destructive border-destructive/30" },
} as const;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

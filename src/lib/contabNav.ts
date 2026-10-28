// Árbol de navegación del Inicio Contable (terminología CONTAD). Solo navegación: cada destino
// apunta a una pantalla existente; los "próximamente" no tienen destino.

export type Pantalla = "compras" | "ventas" | "pagos" | "asientos" | "periodos" | "libros" | "reportes" | "config" | "ordenes" | "gastos" | "proveedores" | "clientes";
/** "admin": pantallas operativas que hoy son solo de administradores (verificado en servidor). */
export type Permiso = "ver" | "centros" | "admin";

export interface Destino {
  pantalla: Pantalla;
  subtab?: string;
  ivaTipo?: "ventas" | "compras";
  abrirAlta?: boolean;
  /** Estado inicial de una pantalla compartida (p. ej. Listado de Asientos = solo consulta). */
  modo?: "listado" | "cierre";
}

export interface NavHoja { id: string; nombre: string; descripcion?: string; destino?: Destino; permiso?: Permiso; }
export interface NavModulo { id: string; nombre: string; descripcion: string; icono: string; permiso?: Permiso; destino?: Destino; hijos: NavHoja[]; }

export const PANTALLAS: Pantalla[] = ["compras", "ventas", "pagos", "asientos", "periodos", "libros", "reportes", "config", "ordenes", "gastos", "proveedores", "clientes"];
export const SUBTABS: Partial<Record<Pantalla, string[]>> = {
  pagos: ["cobros", "pagos"], libros: ["diario", "mayor", "balance"],
  reportes: ["iva", "obras", "maquinas"], config: ["empresa", "plan", "terceros", "centros"],
};

const prox = (id: string, nombre: string): NavHoja => ({ id, nombre });

/** Mapa principal congelado: cada función tiene UNA ubicación principal (nomenclatura CONTAD). */
export const NAV: NavModulo[] = [
  { id: "compras", nombre: "Compras", icono: "ShoppingCart", descripcion: "Registro de compras, órdenes de compra y gastos generales", hijos: [
    { id: "comprobantes", nombre: "Registro de Compras", destino: { pantalla: "compras" } },
    { id: "ordenes", nombre: "Órdenes de Compra", destino: { pantalla: "ordenes" }, permiso: "admin" },
    { id: "gastos", nombre: "Gastos Generales", destino: { pantalla: "gastos" }, permiso: "admin" },
  ] },
  { id: "ventas", nombre: "Ventas", icono: "Receipt", descripcion: "Facturación y comprobantes a clientes",
    destino: { pantalla: "ventas" }, hijos: [] },
  { id: "egresos", nombre: "Egresos", icono: "ArrowUpRight", descripcion: "Orden de pago y pagos realizados", hijos: [
    { id: "orden-pago", nombre: "Orden de Pago", descripcion: "Registrar un nuevo pago", destino: { pantalla: "pagos", subtab: "pagos", abrirAlta: true } },
    { id: "pagos", nombre: "Pagos realizados", destino: { pantalla: "pagos", subtab: "pagos" } },
  ] },
  { id: "ingresos", nombre: "Ingresos", icono: "ArrowDownLeft", descripcion: "Recibos y cobranzas efectuadas", hijos: [
    { id: "recibo", nombre: "Recibos de Cobranzas", descripcion: "Registrar una nueva cobranza", destino: { pantalla: "pagos", subtab: "cobros", abrirAlta: true } },
    { id: "cobranzas", nombre: "Cobranzas Efectuadas", destino: { pantalla: "pagos", subtab: "cobros" } },
  ] },
  { id: "proveedores", nombre: "Proveedores", icono: "Truck", descripcion: "Códigos de proveedores, cuentas corrientes y deuda", hijos: [
    { id: "maestro", nombre: "Códigos de Proveedores", descripcion: "Datos de los proveedores", destino: { pantalla: "proveedores" }, permiso: "admin" },
    prox("cta-cte", "Cuentas Corrientes"),
    prox("totales", "Totales por Proveedores"),
    prox("mov-conceptos", "Movimientos por Conceptos"),
    prox("totales-vto", "Totales por Proveedores y por Vencimientos"),
    prox("deuda-vencida", "Deuda Vencida por Proveedores"),
    prox("agenda-pagos", "Agenda de Pagos"),
  ] },
  { id: "clientes", nombre: "Clientes", icono: "Users", descripcion: "Códigos de clientes, cuentas corrientes y deuda", hijos: [
    { id: "maestro", nombre: "Códigos de Clientes", descripcion: "Datos de los clientes", destino: { pantalla: "clientes" }, permiso: "admin" },
    prox("cta-cte", "Cuentas Corrientes"),
    prox("totales", "Totales por Clientes"),
    prox("totales-vto", "Totales por Clientes y por Vencimientos"),
    prox("deuda-vencida", "Deuda Vencida por Clientes"),
    prox("informe", "Informe por Cliente"),
    prox("pendientes", "Facturas Pendientes de Cobro"),
  ] },
  { id: "contable", nombre: "Contable", icono: "BookOpen", descripcion: "Asientos, libros, plan de cuentas, ejercicios y cierres", hijos: [
    { id: "asientos", nombre: "Asientos Generales", destino: { pantalla: "asientos" } },
    { id: "mayor", nombre: "Mayor de Cuentas", destino: { pantalla: "libros", subtab: "mayor" } },
    { id: "sumas", nombre: "Sumas y Saldos", destino: { pantalla: "libros", subtab: "balance" } },
    { id: "plan", nombre: "Plan de Cuentas", destino: { pantalla: "config", subtab: "plan" } },
    { id: "listado", nombre: "Listado de Asientos", descripcion: "Consulta de asientos", destino: { pantalla: "asientos", modo: "listado" } },
    { id: "diario", nombre: "Libro Diario", destino: { pantalla: "libros", subtab: "diario" } },
    { id: "ejercicios", nombre: "Ejercicios", destino: { pantalla: "periodos" } },
    prox("banco", "Libro Banco"),
    { id: "cierre-mes", nombre: "Cierre de Mes", descripcion: "Cierre de períodos mensuales", destino: { pantalla: "periodos", modo: "cierre" } },
    prox("cierre-ejercicio", "Cierre de Ejercicio"),
    prox("apertura-ejercicio", "Apertura de Ejercicio"),
  ] },
  { id: "informes", nombre: "Informes", icono: "BarChart3", descripcion: "Rentabilidad por obra, costo por máquina e informes", hijos: [
    prox("posicion-iva", "Posición IVA"),
    prox("mov-mensual", "Movimiento Mensual de Cuentas"),
    prox("caja-bancos", "Saldos de Caja y Bancos"),
    prox("compras", "Informes de Compras"),
    prox("ventas", "Informes de Ventas"),
    { id: "obras", nombre: "Rentabilidad por Obra", destino: { pantalla: "reportes", subtab: "obras" } },
    { id: "maquinas", nombre: "Costo por Máquina", destino: { pantalla: "reportes", subtab: "maquinas" } },
  ] },
  { id: "impuestos", nombre: "Impuestos", icono: "Percent", descripcion: "IVA, IIBB, retenciones y percepciones", hijos: [
    { id: "iva-compras", nombre: "IVA · Libro IVA Compras", destino: { pantalla: "reportes", subtab: "iva", ivaTipo: "compras" } },
    { id: "iva-ventas", nombre: "IVA · Libro IVA Ventas", destino: { pantalla: "reportes", subtab: "iva", ivaTipo: "ventas" } },
    prox("iibb", "Impuesto IIBB"),
    prox("ret-perc", "Retenciones / Percepciones"),
    prox("info-cv", "Información de Compras/Ventas"),
    prox("iva-digital", "IVA Digital"),
  ] },
  { id: "otras", nombre: "Otras Opciones", icono: "Settings", descripcion: "Centros de costos, empresa y fichas fiscales", hijos: [
    { id: "centros", nombre: "Centros de Costos", destino: { pantalla: "config", subtab: "centros" }, permiso: "centros" },
    { id: "subcentros", nombre: "Sub Centros de Costos", destino: { pantalla: "config", subtab: "centros" }, permiso: "centros" },
    { id: "empresa", nombre: "Empresa", destino: { pantalla: "config", subtab: "empresa" } },
    { id: "fichas", nombre: "Fichas fiscales", destino: { pantalla: "config", subtab: "terceros" } },
  ] },
];

/** Ubicaciones anteriores → ubicación principal actual (para no romper URLs ni recientes). */
export const ALIAS: Record<string, [string, string?]> = {
  "banco": ["contable", "banco"],
  "centros": ["otras", "centros"],
  "config": ["otras"],
  "config/empresa": ["otras", "empresa"],
  "config/plan": ["contable", "plan"],
  "config/fichas": ["otras", "fichas"],
  "proveedores/ordenes-pago": ["egresos", "orden-pago"],
  "proveedores/comprobantes": ["compras", "comprobantes"],
  "proveedores/fichas": ["otras", "fichas"],
  "clientes/cobranzas": ["ingresos", "cobranzas"],
  "clientes/comprobantes": ["ventas"],
  "clientes/fichas": ["otras", "fichas"],
  "egresos/retenciones": ["impuestos", "ret-perc"],
};

/** Traduce una ubicación antigua a la actual; si no hay alias, devuelve la misma. */
export function canonico(m: string, s?: string | null): [string, string | undefined] {
  const a = ALIAS[s ? `${m}/${s}` : m];
  return a ? [a[0], a[1]] : [m, s ?? undefined];
}

export type Permisos = Record<Permiso, boolean>;
const permitido = (p: Permisos, ...req: (Permiso | undefined)[]) => req.every((r) => p[r ?? "ver"]);

/** Un módulo sin destino ni hijos es "Próximamente". */
export const esProximamente = (m: NavModulo) => !m.destino && m.hijos.length === 0;

/** Árbol filtrado por permisos actuales. */
export function navPermitida(p: Permisos): NavModulo[] {
  return NAV.filter((m) => permitido(p, m.permiso))
    .map((m) => ({ ...m, hijos: m.hijos.filter((h) => permitido(p, m.permiso, h.permiso)) }));
}

export interface Resolucion { modulo: NavModulo; hoja?: NavHoja; destino?: Destino; proximamente: boolean; }

/** Resuelve ?m=&s= contra el árbol permitido. null = no existe o no autorizado. */
export function resolver(m: string | null | undefined, s: string | null | undefined, p: Permisos): Resolucion | null {
  if (!m) return null;
  [m, s] = canonico(m, s);
  const mod = navPermitida(p).find((x) => x.id === m);
  if (!mod) return null;
  if (!s) return { modulo: mod, destino: mod.destino, proximamente: esProximamente(mod) };
  const hoja = mod.hijos.find((h) => h.id === s);
  if (!hoja) return null;
  return { modulo: mod, hoja, destino: hoja.destino, proximamente: !hoja.destino };
}

export interface ResultadoBusqueda { m: string; s?: string; etiqueta: string; modulo: string; sub?: string; icono: string; proximamente: boolean; }

const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Busca módulos y subaccesos permitidos (incluye "Próximamente", marcados). */
export function buscar(q: string, p: Permisos): ResultadoBusqueda[] {
  const t = norm(q.trim());
  if (!t) return [];
  const out: ResultadoBusqueda[] = [];
  for (const m of navPermitida(p)) {
    if (norm(`${m.nombre} ${m.descripcion}`).includes(t))
      out.push({ m: m.id, etiqueta: m.nombre, modulo: m.nombre, icono: m.icono, proximamente: esProximamente(m) });
    for (const h of m.hijos) {
      if (norm(`${m.nombre} ${h.nombre}`).includes(t))
        out.push({ m: m.id, s: h.id, etiqueta: `${m.nombre} > ${h.nombre}`, modulo: m.nombre, sub: h.nombre, icono: m.icono, proximamente: !h.destino });
    }
  }
  return out;
}

/** Migas: Módulo > Subacceso (recorrido elegido, no la pantalla de destino).
 *  "Inicio Contable" no se repite: ya está el botón de regreso al launcher. */
export function migas(r: Resolucion | null): { etiqueta: string; m?: string; s?: string }[] {
  if (!r) return [];
  const out: { etiqueta: string; m?: string; s?: string }[] = [{ etiqueta: r.modulo.nombre, m: r.modulo.id }];
  if (r.hoja) out.push({ etiqueta: r.hoja.nombre, m: r.modulo.id, s: r.hoja.id });
  return out;
}

// ---------- Recientes (solo comodidad, nunca otorgan permisos) ----------
export interface Reciente { m: string; s?: string; }
export const RECIENTES_KEY = "contab_recientes_v1";
export const MAX_RECIENTES = 6;

export function agregarReciente(lista: Reciente[], r: Reciente): Reciente[] {
  return [r, ...lista.filter((x) => !(x.m === r.m && (x.s ?? "") === (r.s ?? "")))].slice(0, MAX_RECIENTES);
}

/** Descarta recientes que ya no existen, no están autorizados o son "Próximamente". */
export function recientesValidos(lista: unknown, p: Permisos): Reciente[] {
  if (!Array.isArray(lista)) return [];
  return lista.filter((x): x is Reciente => !!x && typeof (x as any).m === "string")
    .map((x) => resolver(x.m, x.s, p))
    .filter((r): r is Resolucion => !!r && !r.proximamente)
    .map((r) => (r.hoja ? { m: r.modulo.id, s: r.hoja.id } : { m: r.modulo.id }))
    .filter((x, i, arr) => arr.findIndex((y) => y.m === x.m && y.s === x.s) === i)
    .slice(0, MAX_RECIENTES);
}

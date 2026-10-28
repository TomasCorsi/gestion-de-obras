// Árbol de navegación del Inicio Contable (terminología CONTAD). Solo navegación: cada destino
// apunta a una pantalla existente; los "próximamente" no tienen destino.

export type Pantalla = "compras" | "ventas" | "pagos" | "asientos" | "periodos" | "libros" | "reportes" | "config" | "ordenes" | "gastos" | "proveedores";
/** "admin": pantallas operativas que hoy son solo de administradores (verificado en servidor). */
export type Permiso = "ver" | "centros" | "admin";

export interface Destino {
  pantalla: Pantalla;
  subtab?: string;
  ivaTipo?: "ventas" | "compras";
  abrirAlta?: boolean;
}

export interface NavHoja { id: string; nombre: string; descripcion?: string; destino?: Destino; permiso?: Permiso; }
export interface NavModulo { id: string; nombre: string; descripcion: string; icono: string; permiso?: Permiso; destino?: Destino; hijos: NavHoja[]; }

export const PANTALLAS: Pantalla[] = ["compras", "ventas", "pagos", "asientos", "periodos", "libros", "reportes", "config", "ordenes", "gastos", "proveedores"];
export const SUBTABS: Partial<Record<Pantalla, string[]>> = {
  pagos: ["cobros", "pagos"], libros: ["diario", "mayor", "balance"],
  reportes: ["iva", "obras", "maquinas"], config: ["empresa", "plan", "terceros", "centros"],
};

export const NAV: NavModulo[] = [
  { id: "compras", nombre: "Compras", icono: "ShoppingCart", descripcion: "Comprobantes, órdenes de compra y gastos generales", hijos: [
    { id: "comprobantes", nombre: "Comprobantes de compra", destino: { pantalla: "compras" } },
    { id: "ordenes", nombre: "Órdenes de Compra", destino: { pantalla: "ordenes" }, permiso: "admin" },
    { id: "gastos", nombre: "Gastos Generales", destino: { pantalla: "gastos" }, permiso: "admin" },
  ] },
  { id: "ventas", nombre: "Ventas", icono: "Receipt", descripcion: "Facturas y comprobantes a clientes",
    destino: { pantalla: "ventas" }, hijos: [] },
  { id: "egresos", nombre: "Egresos", icono: "ArrowUpRight", descripcion: "Órdenes de pago y pagos realizados", hijos: [
    { id: "orden-pago", nombre: "Orden de Pago", descripcion: "Registrar un nuevo pago", destino: { pantalla: "pagos", subtab: "pagos", abrirAlta: true } },
    { id: "pagos", nombre: "Pagos realizados", destino: { pantalla: "pagos", subtab: "pagos" } },
    { id: "retenciones", nombre: "Retenciones" },
  ] },
  { id: "ingresos", nombre: "Ingresos", icono: "ArrowDownLeft", descripcion: "Recibos y cobranzas", hijos: [
    { id: "recibo", nombre: "Recibos de Cobranza", descripcion: "Registrar una nueva cobranza", destino: { pantalla: "pagos", subtab: "cobros", abrirAlta: true } },
    { id: "cobranzas", nombre: "Cobranzas realizadas", destino: { pantalla: "pagos", subtab: "cobros" } },
  ] },
  { id: "proveedores", nombre: "Proveedores", icono: "Truck", descripcion: "Maestro, cuenta corriente y comprobantes", hijos: [
    { id: "maestro", nombre: "Proveedores", descripcion: "Datos de los proveedores", destino: { pantalla: "proveedores" }, permiso: "admin" },
    { id: "cta-cte", nombre: "Cuenta Corriente" },
    { id: "totales", nombre: "Totales de Proveedores" },
    { id: "ordenes-pago", nombre: "Órdenes de Pago", destino: { pantalla: "pagos", subtab: "pagos" } },
    { id: "comprobantes", nombre: "Comprobantes", destino: { pantalla: "compras" } },
    { id: "fichas", nombre: "Fichas fiscales", destino: { pantalla: "config", subtab: "terceros" } },
  ] },
  { id: "clientes", nombre: "Clientes", icono: "Users", descripcion: "Cuenta corriente, cobranzas y comprobantes", hijos: [
    { id: "cta-cte", nombre: "Cuenta Corriente" },
    { id: "totales", nombre: "Totales de Clientes" },
    { id: "cobranzas", nombre: "Cobranzas", destino: { pantalla: "pagos", subtab: "cobros" } },
    { id: "comprobantes", nombre: "Comprobantes", destino: { pantalla: "ventas" } },
    { id: "fichas", nombre: "Fichas fiscales", destino: { pantalla: "config", subtab: "terceros" } },
  ] },
  { id: "contable", nombre: "Contable", icono: "BookOpen", descripcion: "Asientos, libros, plan de cuentas y ejercicios", hijos: [
    { id: "asientos", nombre: "Asientos Generales", destino: { pantalla: "asientos" } },
    { id: "diario", nombre: "Libro Diario", destino: { pantalla: "libros", subtab: "diario" } },
    { id: "mayor", nombre: "Mayor de Cuentas", destino: { pantalla: "libros", subtab: "mayor" } },
    { id: "sumas", nombre: "Sumas y Saldos", destino: { pantalla: "libros", subtab: "balance" } },
    { id: "plan", nombre: "Plan de Cuentas", destino: { pantalla: "config", subtab: "plan" } },
    { id: "ejercicios", nombre: "Ejercicios", destino: { pantalla: "periodos" } },
  ] },
  { id: "banco", nombre: "Libro Banco", icono: "Landmark", descripcion: "Movimientos bancarios", hijos: [] },
  { id: "impuestos", nombre: "Impuestos", icono: "Percent", descripcion: "Libros de IVA y retenciones", hijos: [
    { id: "iva-compras", nombre: "Libro IVA Compras", destino: { pantalla: "reportes", subtab: "iva", ivaTipo: "compras" } },
    { id: "iva-ventas", nombre: "Libro IVA Ventas", destino: { pantalla: "reportes", subtab: "iva", ivaTipo: "ventas" } },
    { id: "ret-perc", nombre: "Retenciones / Percepciones" },
  ] },
  { id: "informes", nombre: "Informes", icono: "BarChart3", descripcion: "Rentabilidad por obra y costo por máquina", hijos: [
    { id: "obras", nombre: "Rentabilidad por Obra", destino: { pantalla: "reportes", subtab: "obras" } },
    { id: "maquinas", nombre: "Costo por Máquina", destino: { pantalla: "reportes", subtab: "maquinas" } },
  ] },
  { id: "centros", nombre: "Centros de costo", icono: "Network", descripcion: "Centros y subcentros", permiso: "centros",
    destino: { pantalla: "config", subtab: "centros" }, hijos: [] },
  { id: "config", nombre: "Configuración", icono: "Settings", descripcion: "Empresa, plan de cuentas y fichas fiscales", hijos: [
    { id: "empresa", nombre: "Datos de la Empresa", destino: { pantalla: "config", subtab: "empresa" } },
    { id: "plan", nombre: "Plan de Cuentas", destino: { pantalla: "config", subtab: "plan" } },
    { id: "fichas", nombre: "Fichas fiscales", destino: { pantalla: "config", subtab: "terceros" } },
  ] },
];

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
    .filter((x) => { const r = resolver(x.m, x.s, p); return !!r && !r.proximamente; })
    .slice(0, MAX_RECIENTES);
}

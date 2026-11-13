export interface CuentaArbol { id: string; parent_id: string | null; activa: boolean }

/** Cuentas activas con su nivel en el árbol (0 = rubro raíz), calculado por cuenta madre. */
export function cuentasConNivel<T extends CuentaArbol>(cuentas: T[]): (T & { nivel: number })[] {
  const porId = new Map(cuentas.map((c) => [c.id, c]));
  const nivel = (c: T): number => {
    let n = 0, p = c.parent_id ? porId.get(c.parent_id) : undefined;
    while (p && n < 20) { n++; p = p.parent_id ? porId.get(p.parent_id) : undefined; }
    return n;
  };
  return cuentas.filter((c) => c.activa).map((c) => ({ ...c, nivel: nivel(c) }));
}

/** Cuentas de Disponibilidades (caja y bancos) del plan CONTAD: código 111xxx. */
export const esCuentaDisponibilidad = (codigo: string) => /^111\d{3}$/.test(codigo);

export interface SectorObraRow { obra_id: string; nombre: string }

const norm = (s: string) => s.trim().toLowerCase();

/** Sectores de una obra, sin duplicados (sin distinguir mayúsculas) y ordenados. */
export function sectoresDeObra(rows: SectorObraRow[], obraId: string | null | undefined): string[] {
  if (!obraId) return [];
  const seen = new Map<string, string>();
  rows.forEach((r) => {
    if (r.obra_id !== obraId) return;
    const clean = r.nombre.trim();
    if (clean && !seen.has(norm(clean))) seen.set(norm(clean), clean);
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es"));
}

export function esSectorNuevo(existentes: string[], nombre: string): boolean {
  const n = norm(nombre);
  return !!n && !existentes.some((e) => norm(e) === n);
}

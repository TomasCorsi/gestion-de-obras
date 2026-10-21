/** Clave única de un material: misma lógica que public.normalizar_material en la base. */
export function normalizarMaterial(t: string): string {
  const map: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n", ø: " " };
  return (t || "")
    .toLowerCase()
    .replace(/[áéíóúüñø]/g, (c) => map[c] ?? c)
    .replace(/(\d)\s*mm\b/g, "$1")
    .replace(/[^a-z0-9,.]+/g, " ")
    .replace(/\b(del|de|nro|n)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Formato prolijo para nombres nuevos: espacios simples y primera letra mayúscula. */
export function formatearNombreMaterial(t: string): string {
  const s = (t || "").replace(/\s+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface RenglonMaterial {
  cantidad: number;
  precio_unitario: number;
}

export const totalRemitoMateriales = (items: RenglonMaterial[]): number =>
  (items || []).reduce((s, i) => s + (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0), 0);

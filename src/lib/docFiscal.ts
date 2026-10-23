export type DocTipo = "CUIT" | "CUIL" | "CDI" | "DNI" | "PASAPORTE" | "EXTRANJERO" | "SIN";

export const DOC_TIPOS: { v: DocTipo; l: string }[] = [
  { v: "CUIT", l: "CUIT" }, { v: "CUIL", l: "CUIL" }, { v: "CDI", l: "CDI" }, { v: "DNI", l: "DNI" },
  { v: "PASAPORTE", l: "Pasaporte" }, { v: "EXTRANJERO", l: "Id. extranjera" }, { v: "SIN", l: "Sin identificar" },
];

const PREFIJOS = ["20", "23", "24", "25", "26", "27", "30", "33", "34", "50", "51", "55"];

export const normalizarDoc = (s: string | null | undefined) =>
  (s ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || null;

/** Misma regla que la base: prefijo válido y dígito verificador módulo 11. */
export function cuitValido(n: string | null): boolean {
  if (!n || !/^\d{11}$/.test(n) || !PREFIJOS.includes(n.slice(0, 2))) return false;
  const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const s = w.reduce((acc, p, i) => acc + p * Number(n[i]), 0);
  let r = 11 - (s % 11);
  if (r === 11) r = 0;
  if (r === 10) return false;
  return r === Number(n[10]);
}

export function docValido(tipo: DocTipo, numero: string | null | undefined): boolean {
  const n = normalizarDoc(numero);
  switch (tipo) {
    case "CUIT": case "CUIL": case "CDI": return cuitValido(n);
    case "DNI": return !!n && /^\d{7,8}$/.test(n);
    case "PASAPORTE": case "EXTRANJERO": return !!n && /^[A-Z0-9]{5,20}$/.test(n);
    case "SIN": return n === null;
  }
}

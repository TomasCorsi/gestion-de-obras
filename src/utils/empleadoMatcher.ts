// Matching local rápido de documentos a empleados.
// Extrae texto del PDF con pdfjs-dist (en el browser) y compara contra el
// personal usando CUIT/DNI/Apellido+Nombre. La columna `personal.dni`
// contiene en realidad el CUIT del empleado.

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite handles ?url
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PersonalLite {
  id: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null; // contiene CUIT
}

export interface PersonalIndexed {
  id: string;
  nombre: string;
  apellido: string;
  nombreNorm: string;
  apellidoNorm: string;
  cuit: string | null; // 11 dígitos
  dniFromCuit: string | null; // 8 dígitos centrales del CUIT
}

export interface LocalMatch {
  personal_id: string | null;
  confidence: "alta" | "media" | "baja" | "sin_match";
  detected: { cuit?: string; dni?: string; nombre?: string; apellido?: string } | null;
}

export const normalize = (s: string | null | undefined): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const digits = (s: string): string => s.replace(/\D+/g, "");

export function buildPersonalIndex(personal: PersonalLite[]): PersonalIndexed[] {
  return personal.map((p) => {
    const d = digits(p.dni || "");
    const cuit = d.length === 11 ? d : null;
    const dniFromCuit = cuit ? cuit.slice(2, 10) : d.length === 8 || d.length === 7 ? d : null;
    return {
      id: p.id,
      nombre: p.nombre || "",
      apellido: p.apellido || "",
      nombreNorm: normalize(p.nombre),
      apellidoNorm: normalize(p.apellido),
      cuit,
      dniFromCuit,
    };
  });
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf, disableWorker: false }).promise;
  let out = "";
  const pageCount = Math.min(pdf.numPages, 10); // alcanza con las primeras páginas
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it: any) => it.str).join(" ") + "\n";
  }
  await pdf.destroy?.();
  return out;
}

const CUIT_RE = /\b(\d{2})[\-\.\s]?(\d{8})[\-\.\s]?(\d)\b/g;
const DNI_RE = /\b(\d{1,2})\.?(\d{3})\.?(\d{3})\b/g;

export function matchEmpleadoLocal(text: string, index: PersonalIndexed[]): LocalMatch {
  if (!text) return { personal_id: null, confidence: "sin_match", detected: null };
  const upperText = normalize(text);

  // 1) CUITs encontrados en el texto
  const cuits = new Set<string>();
  let m: RegExpExecArray | null;
  CUIT_RE.lastIndex = 0;
  while ((m = CUIT_RE.exec(text))) {
    cuits.add(m[1] + m[2] + m[3]);
  }
  for (const c of cuits) {
    const found = index.find((p) => p.cuit === c);
    if (found) {
      return {
        personal_id: found.id,
        confidence: "alta",
        detected: { cuit: c, nombre: found.nombre, apellido: found.apellido },
      };
    }
  }

  // 2) DNIs (8 dígitos) — comparo contra dniFromCuit
  const dnis = new Set<string>();
  DNI_RE.lastIndex = 0;
  while ((m = DNI_RE.exec(text))) {
    const d = m[1] + m[2] + m[3];
    if (d.length >= 7 && d.length <= 8) dnis.add(d.padStart(8, "0"));
  }
  for (const d of dnis) {
    const found = index.find((p) => p.dniFromCuit && p.dniFromCuit.padStart(8, "0") === d);
    if (found) {
      return {
        personal_id: found.id,
        confidence: "alta",
        detected: { dni: d, nombre: found.nombre, apellido: found.apellido },
      };
    }
  }

  // 3) Apellido + Nombre normalizado presentes
  const candidatosNombre = index.filter(
    (p) => p.apellidoNorm.length >= 3 && upperText.includes(p.apellidoNorm)
  );
  for (const c of candidatosNombre) {
    const primerNombre = c.nombreNorm.split(" ")[0];
    if (primerNombre.length >= 3 && upperText.includes(primerNombre)) {
      return {
        personal_id: c.id,
        confidence: "media",
        detected: { nombre: c.nombre, apellido: c.apellido },
      };
    }
  }

  // 4) Solo apellido único candidato
  if (candidatosNombre.length === 1) {
    const c = candidatosNombre[0];
    return {
      personal_id: c.id,
      confidence: "baja",
      detected: { apellido: c.apellido },
    };
  }

  // Devolver lo detectado aunque no haya match
  const firstCuit = Array.from(cuits)[0];
  const firstDni = Array.from(dnis)[0];
  return {
    personal_id: null,
    confidence: "sin_match",
    detected: firstCuit || firstDni ? { cuit: firstCuit, dni: firstDni } : null,
  };
}

// Helper: corre tareas con concurrencia limitada.
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await worker(items[i], i);
      } catch (e) {
        results[i] = e as any;
      }
      done++;
      onProgress?.(done, items.length);
    }
  });
  await Promise.all(runners);
  return results;
}

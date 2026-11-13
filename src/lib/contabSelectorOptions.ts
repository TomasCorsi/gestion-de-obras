export interface ObraSelector {
  id: string;
  nombre: string;
  numero?: string | null;
}

export interface MaquinaSelector {
  id: string;
  nombre: string;
  codigo?: string | null;
  tipo?: string | null;
  patente?: string | null;
}

export function opcionObra(o: ObraSelector) {
  return { value: o.id, label: [o.numero, o.nombre].filter(Boolean).join(" · "), searchValue: [o.numero, o.nombre].filter(Boolean).join(" ") };
}

export function opcionMaquina(m: MaquinaSelector) {
  return { value: m.id, label: [m.codigo, m.nombre, m.tipo, m.patente].filter(Boolean).join(" · "), searchValue: [m.codigo, m.nombre, m.tipo, m.patente].filter(Boolean).join(" ") };
}
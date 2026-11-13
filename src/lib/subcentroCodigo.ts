/** Proposes a readable code without colliding with codes in the selected center. */
export function proponerCodigoSubcentro(centro: string, nombre: string, existentes: string[]): string {
  const base = `${centro}-${nombre}`.toUpperCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "SC";
  const usados = new Set(existentes.map((c) => c.toUpperCase()));
  let codigo = base.slice(0, 30);
  for (let n = 2; usados.has(codigo); n++) {
    const sufijo = `-${n}`;
    codigo = base.slice(0, 30 - sufijo.length) + sufijo;
  }
  return codigo;
}

export function errorGuardarSubcentro(error: { code?: string; message?: string }): string {
  return error.code === "23505"
    ? "El código o vínculo ya está registrado en este centro. Revisá el código o actualizá la lista de sugeridos."
    : error.message ?? "No se pudo guardar el subcentro";
}
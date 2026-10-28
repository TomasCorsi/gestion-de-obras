import { describe, it, expect } from "vitest";
import { NAV, PANTALLAS, SUBTABS, buscar, resolver, migas, navPermitida, recientesValidos, agregarReciente, MAX_RECIENTES } from "./contabNav";

const todo = { ver: true, centros: true };
const sinCentros = { ver: true, centros: false };
const nada = { ver: false, centros: false };

describe("árbol de navegación contable", () => {
  it("tiene las 12 entradas principales con los nombres CONTAD", () => {
    expect(NAV.map((m) => m.nombre)).toEqual(["Compras", "Ventas", "Egresos", "Ingresos", "Proveedores", "Clientes", "Contable",
      "Libro Banco", "Impuestos", "Informes", "Centros de costo", "Configuración"]);
  });
  it("cada destino apunta a una pantalla y subpestaña existentes", () => {
    for (const m of NAV) for (const d of [m.destino, ...m.hijos.map((h) => h.destino)]) {
      if (!d) continue;
      expect(PANTALLAS).toContain(d.pantalla);
      if (d.subtab) expect(SUBTABS[d.pantalla]).toContain(d.subtab);
    }
  });
  it("Compras y Proveedores > Comprobantes comparten la misma pantalla", () => {
    expect(resolver("compras", null, todo)!.destino).toEqual(resolver("proveedores", "comprobantes", todo)!.destino);
  });
});

describe("permisos", () => {
  it("sin permiso de centros se oculta Centros de costo y no se puede entrar", () => {
    expect(navPermitida(sinCentros).some((m) => m.id === "centros")).toBe(false);
    expect(resolver("centros", null, sinCentros)).toBeNull();
    expect(buscar("centros", sinCentros)).toEqual([]);
  });
  it("sin permiso de ver no hay nada", () => {
    expect(navPermitida(nada)).toEqual([]);
    expect(resolver("compras", null, nada)).toBeNull();
  });
  it("recientes no autorizados, inexistentes o próximamente se descartan", () => {
    const lista = [{ m: "centros" }, { m: "contable", s: "mayor" }, { m: "nada" }, { m: "proveedores", s: "cta-cte" }, "basura"];
    expect(recientesValidos(lista, sinCentros)).toEqual([{ m: "contable", s: "mayor" }]);
    expect(recientesValidos("x", todo)).toEqual([]);
  });
  it("recientes guarda como máximo 6 sin duplicados", () => {
    let l: { m: string; s?: string }[] = [];
    for (let i = 0; i < 8; i++) l = agregarReciente(l, { m: "contable", s: String(i) });
    l = agregarReciente(l, { m: "contable", s: "5" });
    expect(l.length).toBe(MAX_RECIENTES);
    expect(l[0]).toEqual({ m: "contable", s: "5" });
    expect(l.filter((x) => x.s === "5").length).toBe(1);
  });
});

describe("búsqueda", () => {
  it("'mayor' encuentra Contable > Mayor de Cuentas sin importar acentos", () => {
    expect(buscar("MAYOR", todo).map((r) => r.etiqueta)).toContain("Contable > Mayor de Cuentas");
    expect(buscar("ordenes de pago", todo).map((r) => r.etiqueta)).toContain("Proveedores > Órdenes de Pago");
  });
  it("muestra los próximamente marcados", () => {
    const r = buscar("cuenta corriente", todo).find((x) => x.etiqueta === "Proveedores > Cuenta Corriente");
    expect(r?.proximamente).toBe(true);
  });
});

describe("breadcrumb", () => {
  it("conserva el recorrido elegido aunque la pantalla sea compartida", () => {
    expect(migas(resolver("proveedores", "comprobantes", todo)).map((c) => c.etiqueta)).toEqual(["Inicio Contable", "Proveedores", "Comprobantes"]);
    expect(migas(resolver("compras", null, todo)).map((c) => c.etiqueta)).toEqual(["Inicio Contable", "Compras"]);
    expect(migas(null).map((c) => c.etiqueta)).toEqual(["Inicio Contable"]);
  });
  it("subacceso inexistente no resuelve", () => {
    expect(resolver("contable", "inventado", todo)).toBeNull();
  });
});

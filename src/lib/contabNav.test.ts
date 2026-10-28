import { describe, it, expect } from "vitest";
import { NAV, PANTALLAS, SUBTABS, buscar, resolver, migas, navPermitida, recientesValidos, agregarReciente, MAX_RECIENTES } from "./contabNav";

const todo = { ver: true, centros: true, admin: true };
const sinCentros = { ver: true, centros: false, admin: true };
const nada = { ver: false, centros: false, admin: false };
const contador = { ver: true, centros: false, admin: false };

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
    expect(resolver("compras", "comprobantes", todo)!.destino).toEqual(resolver("proveedores", "comprobantes", todo)!.destino);
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
  it("los resultados llevan módulo, subacceso e icono para mostrar la jerarquía", () => {
    const mayor = buscar("mayor", todo).find((x) => x.sub === "Mayor de Cuentas");
    expect(mayor).toMatchObject({ m: "contable", s: "mayor", modulo: "Contable", icono: "BookOpen", proximamente: false });
    const banco = buscar("banco", todo).find((x) => !x.sub);
    expect(banco).toMatchObject({ m: "banco", modulo: "Libro Banco", icono: "Landmark", proximamente: true });
    // "retenciones" también coincide con la descripción del módulo Impuestos (disponible); los accesos pendientes van marcados.
    expect(buscar("retenciones", todo).filter((x) => x.sub).every((x) => x.proximamente)).toBe(true);
    expect(buscar("pago", todo).some((x) => x.m === "egresos" && x.s === "orden-pago" && !x.proximamente)).toBe(true);
  });
});

describe("breadcrumb", () => {
  it("conserva el recorrido elegido aunque la pantalla sea compartida, sin repetir Inicio Contable", () => {
    expect(migas(resolver("proveedores", "comprobantes", todo)).map((c) => c.etiqueta)).toEqual(["Proveedores", "Comprobantes"]);
    expect(migas(resolver("contable", "mayor", todo)).map((c) => c.etiqueta)).toEqual(["Contable", "Mayor de Cuentas"]);
    expect(migas(resolver("compras", "comprobantes", todo)).map((c) => c.etiqueta)).toEqual(["Compras", "Comprobantes de compra"]);
    expect(migas(null)).toEqual([]);
  });
  it("subacceso inexistente no resuelve", () => {
    expect(resolver("contable", "inventado", todo)).toBeNull();
  });
});

describe("reubicación de Órdenes de Compra y Gastos Generales", () => {
  it("Compras tiene Comprobantes, Órdenes de Compra y Gastos Generales", () => {
    expect(NAV.find((m) => m.id === "compras")!.hijos.map((h) => h.nombre)).toEqual(["Comprobantes de compra", "Órdenes de Compra", "Gastos Generales"]);
  });
  it("Proveedores tiene el maestro primero y sin órdenes de compra", () => {
    const h = NAV.find((m) => m.id === "proveedores")!.hijos;
    expect(h[0]).toMatchObject({ id: "maestro", destino: { pantalla: "proveedores" } });
    expect(h.some((x) => x.destino?.pantalla === "ordenes" || x.destino?.pantalla === "gastos")).toBe(false);
  });
  it("breadcrumb Compras › Órdenes de Compra", () => {
    expect(migas(resolver("compras", "ordenes", todo)).map((c) => c.etiqueta)).toEqual(["Compras", "Órdenes de Compra"]);
  });
  it("un contador sin rol admin no entra a órdenes, gastos ni maestro", () => {
    expect(resolver("compras", "ordenes", contador)).toBeNull();
    expect(resolver("compras", "gastos", contador)).toBeNull();
    expect(resolver("proveedores", "maestro", contador)).toBeNull();
    expect(resolver("compras", "comprobantes", contador)).not.toBeNull();
  });
  it("la búsqueda encuentra órdenes de compra y gastos dentro de Compras", () => {
    expect(buscar("orden de compra", todo).map((r) => r.etiqueta)).toContain("Compras > Órdenes de Compra");
    expect(buscar("gastos", todo).map((r) => r.etiqueta)).toContain("Compras > Gastos Generales");
  });
});

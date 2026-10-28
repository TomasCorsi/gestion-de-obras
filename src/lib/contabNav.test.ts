import { describe, it, expect } from "vitest";
import { NAV, PANTALLAS, SUBTABS, buscar, resolver, migas, navPermitida, recientesValidos, agregarReciente, MAX_RECIENTES } from "./contabNav";

const todo = { ver: true, centros: true, admin: true };
const sinCentros = { ver: true, centros: false, admin: true };
const nada = { ver: false, centros: false, admin: false };
const contador = { ver: true, centros: false, admin: false };

describe("árbol de navegación contable", () => {
  it("tiene las 10 entradas principales con los nombres CONTAD", () => {
    expect(NAV.map((m) => m.nombre)).toEqual(["Compras", "Ventas", "Egresos", "Ingresos", "Proveedores", "Clientes", "Contable",
      "Informes", "Impuestos", "Otras Opciones"]);
  });
  it("cada destino apunta a una pantalla y subpestaña existentes", () => {
    for (const m of NAV) for (const d of [m.destino, ...m.hijos.map((h) => h.destino)]) {
      if (!d) continue;
      expect(PANTALLAS).toContain(d.pantalla);
      if (d.subtab) expect(SUBTABS[d.pantalla]).toContain(d.subtab);
    }
  });
  it("el enlace viejo Proveedores > Comprobantes abre Compras > Registro de Compras", () => {
    expect(resolver("proveedores", "comprobantes", todo)).toMatchObject({ modulo: { id: "compras" }, hoja: { id: "comprobantes" } });
  });
});

describe("permisos", () => {
  it("sin permiso de centros se oculta Centros de costo y no se puede entrar", () => {
    const otras = navPermitida(sinCentros).find((m) => m.id === "otras")!;
    expect(otras.hijos.some((h) => h.id === "centros" || h.id === "subcentros")).toBe(false);
    expect(resolver("centros", null, sinCentros)).toBeNull();
    expect(resolver("otras", "subcentros", sinCentros)).toBeNull();
    expect(buscar("centros", sinCentros).filter((r) => r.sub)).toEqual([]);
  });
  it("sin permiso de ver no hay nada", () => {
    expect(navPermitida(nada)).toEqual([]);
    expect(resolver("compras", null, nada)).toBeNull();
  });
  it("recientes no autorizados, inexistentes o próximamente se descartan", () => {
    const lista = [{ m: "centros" }, { m: "contable", s: "mayor" }, { m: "nada" }, { m: "proveedores", s: "cta-cte" }, { m: "banco" }, "basura"];
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
    expect(buscar("orden de pago", todo).filter((r) => r.sub).map((r) => r.etiqueta)).toEqual(["Egresos > Orden de Pago"]);
  });
  it("muestra los próximamente marcados", () => {
    const r = buscar("cuentas corrientes", todo).find((x) => x.etiqueta === "Proveedores > Cuentas Corrientes");
    expect(r?.proximamente).toBe(true);
  });
  it("los resultados llevan módulo, subacceso e icono para mostrar la jerarquía", () => {
    const mayor = buscar("mayor", todo).find((x) => x.sub === "Mayor de Cuentas");
    expect(mayor).toMatchObject({ m: "contable", s: "mayor", modulo: "Contable", icono: "BookOpen", proximamente: false });
    const banco = buscar("libro banco", todo);
    expect(banco).toEqual([expect.objectContaining({ m: "contable", s: "banco", modulo: "Contable", proximamente: true })]);
    // "retenciones" también coincide con la descripción del módulo Impuestos (disponible); los accesos pendientes van marcados.
    expect(buscar("retenciones", todo).filter((x) => x.sub).every((x) => x.proximamente)).toBe(true);
    expect(buscar("pago", todo).some((x) => x.m === "egresos" && x.s === "orden-pago" && !x.proximamente)).toBe(true);
  });
});

describe("breadcrumb", () => {
  it("conserva el recorrido elegido aunque la pantalla sea compartida, sin repetir Inicio Contable", () => {
    expect(migas(resolver("proveedores", "maestro", todo)).map((c) => c.etiqueta)).toEqual(["Proveedores", "Códigos de Proveedores"]);
    expect(migas(resolver("contable", "mayor", todo)).map((c) => c.etiqueta)).toEqual(["Contable", "Mayor de Cuentas"]);
    expect(migas(resolver("compras", "comprobantes", todo)).map((c) => c.etiqueta)).toEqual(["Compras", "Registro de Compras"]);
    expect(migas(null)).toEqual([]);
  });
  it("subacceso inexistente no resuelve", () => {
    expect(resolver("contable", "inventado", todo)).toBeNull();
  });
});

describe("reubicación de Órdenes de Compra y Gastos Generales", () => {
  it("Compras tiene Comprobantes, Órdenes de Compra y Gastos Generales", () => {
    expect(NAV.find((m) => m.id === "compras")!.hijos.map((h) => h.nombre)).toEqual(["Registro de Compras", "Órdenes de Compra", "Gastos Generales"]);
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
  it("Administrador conserva los tres accesos completos en el launcher", () => {
    expect(resolver("compras", "ordenes", todo)?.destino?.pantalla).toBe("ordenes");
    expect(resolver("compras", "gastos", todo)?.destino?.pantalla).toBe("gastos");
    expect(resolver("proveedores", "maestro", todo)?.destino?.pantalla).toBe("proveedores");
  });
  it("la búsqueda encuentra órdenes de compra y gastos dentro de Compras", () => {
    expect(buscar("ordenes de compra", todo).map((r) => r.etiqueta)).toContain("Compras > Órdenes de Compra");
    expect(buscar("gastos", todo).map((r) => r.etiqueta)).toContain("Compras > Gastos Generales");
  });
});

describe("mapa CONTAD: una única ubicación principal por función", () => {
  const clave = (d: any) => JSON.stringify(d);
  it("ningún destino se repite, salvo estados iniciales distintos explícitos", () => {
    const vistos = new Map<string, string>();
    for (const m of NAV) for (const h of m.hijos) {
      if (!h.destino) continue;
      if (h.id === "subcentros") continue; // misma pantalla de Centros y Subcentros
      const k = clave(h.destino);
      expect(vistos.get(k), `${m.id}/${h.id} duplica ${vistos.get(k)}`).toBeUndefined();
      vistos.set(k, `${m.id}/${h.id}`);
    }
  });
  it("Orden de Pago solo en Egresos; Retenciones fuera de Egresos", () => {
    const prov = NAV.find((m) => m.id === "proveedores")!.hijos;
    expect(prov.some((h) => h.destino?.pantalla === "pagos")).toBe(false);
    expect(NAV.find((m) => m.id === "egresos")!.hijos.some((h) => /retenc/i.test(h.nombre))).toBe(false);
  });
  it("Clientes no repite Cobranzas, Comprobantes ni Fichas; Proveedores no repite Fichas", () => {
    for (const id of ["clientes", "proveedores"]) {
      const h = NAV.find((m) => m.id === id)!.hijos;
      expect(h.some((x) => ["pagos", "ventas", "compras", "config"].includes(x.destino?.pantalla ?? ""))).toBe(false);
    }
  });
  it("Posición IVA es Próximamente y no abre el Libro IVA", () => {
    const r = resolver("informes", "posicion-iva", todo)!;
    expect(r.proximamente).toBe(true);
    expect(r.destino).toBeUndefined();
  });
  it("Listado de Asientos y Cierre de Mes reutilizan pantallas con estado inicial propio", () => {
    expect(resolver("contable", "listado", todo)!.destino).toEqual({ pantalla: "asientos", modo: "listado" });
    expect(resolver("contable", "cierre-mes", todo)!.destino).toEqual({ pantalla: "periodos", modo: "cierre" });
  });
  it("Códigos de Clientes abre el maestro de clientes", () => {
    expect(resolver("clientes", "maestro", todo)!.destino?.pantalla).toBe("clientes");
  });
  it("rutas antiguas resuelven a la nueva ubicación", () => {
    const casos: [string, string | null, string, string | undefined][] = [
      ["banco", null, "contable", "banco"], ["centros", null, "otras", "centros"], ["config", null, "otras", undefined],
      ["config", "plan", "contable", "plan"], ["config", "empresa", "otras", "empresa"], ["config", "fichas", "otras", "fichas"],
      ["proveedores", "ordenes-pago", "egresos", "orden-pago"], ["proveedores", "fichas", "otras", "fichas"],
      ["clientes", "cobranzas", "ingresos", "cobranzas"], ["clientes", "comprobantes", "ventas", undefined],
      ["egresos", "retenciones", "impuestos", "ret-perc"],
    ];
    for (const [m, s, m2, s2] of casos) {
      const r = resolver(m, s, todo)!;
      expect(r.modulo.id, `${m}/${s}`).toBe(m2);
      expect(r.hoja?.id).toBe(s2);
    }
  });
  it("recientes antiguos se convierten a la ubicación nueva", () => {
    expect(recientesValidos([{ m: "config", s: "plan" }, { m: "contable", s: "plan" }], todo)).toEqual([{ m: "contable", s: "plan" }]);
  });
});

describe("secciones internas de Otras Opciones / Contable", () => {
  it("cada acceso abre su sección propia de la configuración", () => {
    const sub = (m: string, s: string) => resolver(m, s, todo)?.destino.subtab;
    expect(sub("contable", "plan")).toBe("plan");
    expect(sub("otras", "empresa")).toBe("empresa");
    expect(sub("otras", "fichas")).toBe("terceros");
    expect(sub("otras", "centros")).toBe("centros");
    expect(sub("otras", "subcentros")).toBe("subcentros");
  });
  it("Listado de Asientos es solo consulta y Cierre de Mes abre períodos", () => {
    expect(resolver("contable", "listado", todo)?.destino).toMatchObject({ pantalla: "asientos", modo: "listado" });
    expect(resolver("contable", "cierre-mes", todo)?.destino.pantalla).toBe("periodos");
  });
});

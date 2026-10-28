import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  etapaComprobante, permisosComprobante, saldoItem, saldoDocumento, docFacturable,
  docTiposPara, admiteFacturable, imputacionesDentroDeLinea, traducirError,
} from "./contab1c";

describe("etapas del comprobante", () => {
  it("sin asiento es registrado", () => expect(etapaComprobante("borrador", null)).toBe("registrado"));
  it("con asiento borrador es asiento borrador", () => expect(etapaComprobante("borrador", "a", "borrador")).toBe("asiento_borrador"));
  it("con asiento confirmado es contabilizado", () => expect(etapaComprobante("confirmado", "a", "confirmado")).toBe("contabilizado"));
  it("anulado gana sobre todo", () => expect(etapaComprobante("anulado", "a", "revertido")).toBe("anulado"));
});

describe("permisos de pantalla", () => {
  const p = (o: Partial<Parameters<typeof permisosComprobante>[0]>) =>
    permisosComprobante({ tipo: "FA_CPA_A", etapa: "registrado", guardado: true, puedeCargar: true, ...o });
  it("nota de crédito no admite vínculos", () => {
    expect(p({ tipo: "NC_CPA" }).vincular).toBe(false);
    expect(p({ tipo: "NC_A" }).vincular).toBe(false);
  });
  it("sin guardar no se reparte ni vincula", () => {
    const r = p({ guardado: false });
    expect(r.editarRepartos).toBe(false);
    expect(r.vincular).toBe(false);
  });
  it("asiento borrador: repartos y regenerar sí, ítems no", () => {
    const r = p({ etapa: "asiento_borrador" });
    expect(r).toMatchObject({ editarItems: false, editarRepartos: true, regenerar: true, generar: false });
  });
  it("contabilizado bloquea todo", () => {
    const r = p({ etapa: "contabilizado" });
    expect(r).toMatchObject({ editarItems: false, editarRepartos: false, vincular: false, generar: false, regenerar: false });
  });
  it("sin permiso de carga no se edita", () => expect(p({ puedeCargar: false }).editarRepartos).toBe(false));
});

describe("saldos", () => {
  it("saldo del ítem con efectivos de la base", () => expect(saldoItem(100, [33.33, 33.33, 33.34])).toBe(0));
  it("saldo parcial", () => expect(saldoItem(1000, [250])).toBe(750));
  it("documento con referencia", () => expect(saldoDocumento(500, 200)).toBe(300));
  it("documento sin importe propio", () => expect(saldoDocumento(null, 0)).toBeNull());
  it("sin importe propio ya facturado no es elegible", () => expect(docFacturable(null, 10)).toBe(false));
  it("sin saldo no es elegible", () => expect(docFacturable(100, 100)).toBe(false));
});

describe("documentos por operación", () => {
  it("ventas solo certificados", () => expect(docTiposPara(true)).toEqual(["certificado"]));
  it("compras nunca certificados", () => expect(docTiposPara(false)).not.toContain("certificado"));
  it("cabecera de OC solo trazabilidad", () => expect(admiteFacturable("orden_compra")).toBe(false));
});

describe("mensajes", () => {
  it("traduce exceso de reparto", () => expect(traducirError("El reparto supera el neto del ítem (100.00)")).toBe("El reparto supera el neto del ítem."));
  it("deja pasar mensajes desconocidos", () => expect(traducirError("otro")).toBe("otro"));
});

describe("regresión 1B: control de importes por línea", () => {
  it("la suma de imputaciones no supera la línea", () => {
    expect(imputacionesDentroDeLinea(100, [60, 40])).toBe(true);
    expect(imputacionesDentroDeLinea(100, [60, 40.01])).toBe(false);
  });
  it("la última definición del control no usa NEW.linea_id dentro de un CASE (falla en contab_asiento_lineas)", () => {
    const dir = join(process.cwd(), "drizzle/migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    const conDef = files.filter((f) => /FUNCTION public\.contab_trg_tope_linea\(\)/.test(readFileSync(join(dir, f), "utf8")));
    const ultimo = conDef[conDef.length - 1];
    expect(ultimo).toBe("0030_contab_1c_repartos_vinculos.sql");
    const sql = readFileSync(join(dir, ultimo), "utf8");
    const cuerpo = sql.slice(sql.indexOf("FUNCTION public.contab_trg_tope_linea()"), sql.indexOf("END $$", sql.indexOf("FUNCTION public.contab_trg_tope_linea()")));
    expect(cuerpo).not.toMatch(/CASE\s+WHEN\s+TG_TABLE_NAME[^;]*NEW\.linea_id/);
    expect(cuerpo).toMatch(/IF TG_TABLE_NAME = 'contab_asiento_lineas' THEN v_linea := NEW\.id; ELSE v_linea := NEW\.linea_id/);
  });
});

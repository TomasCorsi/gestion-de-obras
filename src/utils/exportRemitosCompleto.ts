import ExcelJS from "exceljs";
import { format, parseISO } from "date-fns";
import { pivotPor, SECCIONES, totalesPorSeccion, type RenglonRemito } from "@/lib/remitosResumen";

const BLACK = "FF0F0F0F", RED = "FFB00020", WHITE = "FFFFFFFF", GRAY = "FFF2F2F2";
const MONEY = '"$"#,##0.00;[Red]-"$"#,##0.00;"-"';
const fecha = (f: string | null) => { if (!f) return ""; try { return format(parseISO(f), "dd/MM/yyyy"); } catch { return f; } };

function header(row: ExcelJS.Row) {
  row.eachCell((c) => { c.font = { bold: true, color: { argb: WHITE } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } }; c.alignment = { vertical: "middle" }; });
}
function total(row: ExcelJS.Row) {
  row.eachCell((c) => { c.font = { bold: true, color: { argb: WHITE } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } }; });
}
function title(ws: ExcelJS.Worksheet, text: string, cols: number) {
  const r = ws.addRow([text]); ws.mergeCells(r.number, 1, r.number, cols);
  r.getCell(1).font = { bold: true, size: 12, color: { argb: RED } };
}

function hojaDetalle(wb: ExcelJS.Workbook, nombre: string, rows: RenglonRemito[]) {
  const ws = wb.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
  const extras = [...new Set(rows.flatMap((r) => Object.keys(r.extra || {})))];
  const conViajes = nombre === "Viajes";
  const cols = ["Fecha", "N° Remito", "Cliente", "Obra", nombre === "Máquinas" ? "Máquina" : nombre === "Materiales" ? "Material" : "Tipo / Concepto", ...(conViajes ? ["Viajes"] : []), "Cantidad", "Unidad", "Precio unit.", "Importe", ...extras];
  header(ws.addRow(cols));
  const sorted = [...rows].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "") || a.numero.localeCompare(b.numero));
  sorted.forEach((r, i) => {
    const row = ws.addRow([fecha(r.fecha), r.numero, r.cliente, r.obra, r.detalle, ...(conViajes ? [r.viajes || 0] : []), r.cantidad, r.unidad, r.precioUnitario, r.importe, ...extras.map((k) => r.extra?.[k] ?? "")]);
    if (i % 2) row.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } }; });
  });
  const iImp = cols.indexOf("Importe") + 1, iPu = cols.indexOf("Precio unit.") + 1, iCant = cols.indexOf("Cantidad") + 1;
  ws.getColumn(iImp).numFmt = MONEY; ws.getColumn(iPu).numFmt = MONEY; ws.getColumn(iCant).numFmt = "#,##0.##";
  if (sorted.length) {
    const L = (n: number) => ws.getColumn(n).letter;
    const t = ws.addRow([]);
    t.getCell(1).value = "TOTAL";
    t.getCell(iImp).value = { formula: `SUBTOTAL(9,${L(iImp)}2:${L(iImp)}${sorted.length + 1})` };
    if (conViajes) t.getCell(6).value = { formula: `SUBTOTAL(9,F2:F${sorted.length + 1})` };
    for (let c = 1; c <= cols.length; c++) t.getCell(c);
    total(t);
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  cols.forEach((c, i) => { ws.getColumn(i + 1).width = ["Cliente", "Obra", "Material", "Máquina", "Tipo / Concepto", "Observaciones"].includes(c) ? 30 : 15; });
}

function hojaResumen(wb: ExcelJS.Workbook, rows: RenglonRemito[], periodo: string) {
  const ws = wb.addWorksheet("Resumen general");
  ws.columns = [{ width: 36 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
  title(ws, `Resumen general de remitos ${periodo}`, 5);
  ws.addRow([]);
  title(ws, "Por tipo de remito", 5);
  header(ws.addRow(["Tipo", "Remitos", "Renglones", "Sin precio", "Importe"]));
  const t = totalesPorSeccion(rows);
  t.forEach((s) => ws.addRow([s.seccion, s.remitos, s.renglones, s.sinPrecio, s.importe]).getCell(5).numFmt = MONEY);
  const tr = ws.addRow(["TOTAL", t.reduce((a, s) => a + s.remitos, 0), t.reduce((a, s) => a + s.renglones, 0), t.reduce((a, s) => a + s.sinPrecio, 0), t.reduce((a, s) => a + s.importe, 0)]);
  tr.getCell(5).numFmt = MONEY; total(tr);
  for (const campo of ["cliente", "obra"] as const) {
    ws.addRow([]);
    title(ws, campo === "cliente" ? "Por cliente" : "Por obra", 5);
    header(ws.addRow([campo === "cliente" ? "Cliente" : "Obra", ...SECCIONES, "Total"]));
    const p = pivotPor(rows, campo);
    p.forEach((f) => { const r = ws.addRow([f.nombre, f.Viajes, f.Materiales, f.Máquinas, f.total]); for (let c = 2; c <= 5; c++) r.getCell(c).numFmt = MONEY; });
    const s = ws.addRow(["TOTAL", ...SECCIONES.map((k) => p.reduce((a, f) => a + f[k], 0)), p.reduce((a, f) => a + f.total, 0)]);
    for (let c = 2; c <= 5; c++) s.getCell(c).numFmt = MONEY;
    total(s);
  }
}

export async function exportarRemitosCompleto(rows: RenglonRemito[], desde?: string, hasta?: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Calamina Sur"; wb.created = new Date();
  const periodo = desde || hasta ? `(${desde ? fecha(desde) : "inicio"} al ${hasta ? fecha(hasta) : "hoy"})` : "(todo el período)";
  hojaResumen(wb, rows, periodo);
  for (const s of SECCIONES) hojaDetalle(wb, s, rows.filter((r) => r.seccion === s));
  wb.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: "visible" }];
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a"); a.href = url; a.download = `Remitos_${format(new Date(), "yyyyMMdd")}.xlsx`; a.click();
  URL.revokeObjectURL(url);
}

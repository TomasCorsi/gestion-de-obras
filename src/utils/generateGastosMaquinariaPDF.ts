import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoCalamina from "@/assets/logo-calamina-sur.png";

const EMPRESA_INFO = {
  nombre: "CALAMINA SUR S.A.",
  cuit: "30-71457642-5",
  direccion: "CASTEX 499 – Piso: 6° Oficina 601",
  localidad: "(1804) Canning - Pcia. Bs. As.",
  telefono: "11-38537787",
  email: "calamimasur@hotmail.com",
};

export interface MaquinariaData {
  codigo: string | null;
  nombre: string | null;
  tipo: string;
  marca: string | null;
  patente: string | null;
  anio: number | null;
  estado: string;
  horas_acumuladas: number;
  km_acumulados: number;
}

export interface TotalesData {
  totalCombustible: number;
  totalLitros: number;
  totalRemitos: number;
  totalViajes: number;
  costoRemitos: number;
  totalMantenimientos: number;
  costoMantenimientos: number;
  gastoTotal: number;
}

export interface CombustibleDetalle {
  fecha: string;
  producto: string;
  litros: number;
  precioUnitario: number;
  costo: number;
  obra: string;
  operador: string;
}

export interface MantenimientoDetalle {
  fecha: string;
  tipo: string;
  descripcion: string;
  costoRepuestos: number;
  costoManoObra: number;
  costo: number;
  tecnico: string;
}

export interface RemitoDetalle {
  fecha: string;
  numero: string;
  tipo_material: string;
  viajes: number;
  cantidad_total: number;
  unidad: string;
  costo: number;
  operador: string;
}

export interface KMData {
  totalKm: number;
}

interface ImageData {
  base64: string;
  width: number;
  height: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

async function loadImageAsBase64(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          base64: canvas.toDataURL("image/png"),
          width: img.width,
          height: img.height,
        });
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

const estadoLabels: Record<string, string> = {
  operativa: "Operativa",
  mantenimiento: "En Mantenimiento",
  inactiva: "Inactiva",
  en_uso: "En Uso",
};

function checkPageBreak(doc: jsPDF, yPos: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos + needed > pageHeight - 15) {
    doc.addPage();
    return 12;
  }
  return yPos;
}

export async function generateGastosMaquinariaPDF(
  maquinaria: MaquinariaData,
  totales: TotalesData,
  combustible: CombustibleDetalle[],
  mantenimientos: MantenimientoDetalle[],
  remitosDetalle: RemitoDetalle[],
  kmData: KMData,
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = 8;

  // Load logo
  let logoData: ImageData | null = null;
  try {
    logoData = await loadImageAsBase64(logoCalamina);
  } catch (e) {
    console.warn("Could not load logo:", e);
  }

  // ============== HEADER ==============
  if (logoData) {
    const logoWidth = 35;
    const logoAspectRatio = logoData.height / logoData.width;
    const logoHeight = logoWidth * logoAspectRatio;
    doc.addImage(logoData.base64, "PNG", margin, yPos, logoWidth, logoHeight);
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, pageWidth - margin, yPos + 3, { align: "right" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`CUIT: ${EMPRESA_INFO.cuit}`, pageWidth - margin, yPos + 7, { align: "right" });
  doc.text(EMPRESA_INFO.direccion, pageWidth - margin, yPos + 11, { align: "right" });
  doc.text(EMPRESA_INFO.localidad, pageWidth - margin, yPos + 15, { align: "right" });
  doc.text(`Cel: ${EMPRESA_INFO.telefono} | ${EMPRESA_INFO.email}`, pageWidth - margin, yPos + 19, { align: "right" });

  yPos += 24;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // ============== REPORT TITLE ==============
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text("REPORTE DE GASTOS POR MAQUINARIA", margin, yPos);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha del reporte: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 6;

  // ============== MACHINERY DATA ==============
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, 22, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL VEHÍCULO / MAQUINARIA", margin + 2, yPos + 2);
  yPos += 5;

  const col1X = margin + 2;
  const col2X = pageWidth / 2;

  doc.setFont("helvetica", "normal");
  const drawField = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + doc.getTextWidth(`${label}: `) + 1, y);
  };

  drawField("Código", maquinaria.codigo || "S/C", col1X, yPos);
  drawField("Nombre", maquinaria.nombre || "Sin nombre", col2X, yPos);
  yPos += 4;

  drawField("Tipo", maquinaria.tipo, col1X, yPos);
  drawField("Marca", maquinaria.marca || "-", col2X, yPos);
  yPos += 4;

  drawField("Patente", maquinaria.patente || "-", col1X, yPos);
  drawField("Año", maquinaria.anio?.toString() || "-", col2X, yPos);
  yPos += 4;

  drawField("Estado", estadoLabels[maquinaria.estado] || maquinaria.estado, col1X, yPos);
  drawField("Horas acum.", maquinaria.horas_acumuladas.toLocaleString(), col2X, yPos);
  yPos += 4;

  drawField("KM acum.", maquinaria.km_acumulados.toLocaleString(), col1X, yPos);
  drawField("KM período", kmData.totalKm.toLocaleString(), col2X, yPos);
  yPos += 6;

  // ============== PERIOD ==============
  const periodoDesde = fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio";
  const periodoHasta = fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual";
  drawField("Período", `${periodoDesde} - ${periodoHasta}`, margin, yPos);
  yPos += 6;

  // ============== EXPENSE SUMMARY - PROMINENT ==============
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, 28, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DE GASTOS", margin + 2, yPos + 2);
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  // Row 1
  doc.text("Combustible/Insumos:", col1X, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`${formatCurrency(totales.totalCombustible)}  (${totales.totalLitros.toLocaleString()} L)`, col1X + 38, yPos);
  yPos += 4;

  doc.setFont("helvetica", "normal");
  doc.text("Remitos/Viajes:", col1X, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`${formatCurrency(totales.costoRemitos)}  (${totales.totalRemitos} remitos - ${totales.totalViajes} viajes)`, col1X + 38, yPos);
  yPos += 4;

  doc.setFont("helvetica", "normal");
  doc.text("Mantenimiento:", col1X, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`${formatCurrency(totales.costoMantenimientos)}  (${totales.totalMantenimientos} servicios)`, col1X + 38, yPos);
  yPos += 4;

  doc.setFont("helvetica", "normal");
  doc.text("KM recorridos:", col1X, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`${kmData.totalKm.toLocaleString()} km`, col1X + 38, yPos);
  yPos += 5;

  // Total line
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(margin + 2, yPos - 1, pageWidth - margin - 2, yPos - 1);

  // GASTO TOTAL - prominent
  doc.setFillColor(180, 0, 0);
  doc.rect(margin, yPos + 1, pageWidth - margin * 2, 8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("GASTO TOTAL:", margin + 4, yPos + 6.5);
  doc.text(formatCurrency(totales.gastoTotal), pageWidth - margin - 4, yPos + 6.5, { align: "right" });
  doc.setTextColor(0, 0, 0);
  yPos += 14;

  // ============== COMBUSTIBLE TABLE ==============
  if (combustible.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 60, 0);
    doc.text("COMBUSTIBLE / INSUMOS", margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 3;

    const combustibleBody = combustible
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((c) => [
        c.fecha ? format(new Date(c.fecha), "dd/MM/yy") : "-",
        c.producto,
        c.litros.toLocaleString(),
        formatCurrency(c.precioUnitario),
        formatCurrency(c.costo),
        c.operador,
        c.obra,
      ]);

    const subtotalComb = combustible.reduce((s, c) => s + c.costo, 0);
    combustibleBody.push(["", "", `${totales.totalLitros.toLocaleString()} L`, "", formatCurrency(subtotalComb), "", "SUBTOTAL"]);

    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "Producto", "Litros", "$/L", "Costo", "Operador", "Obra"]],
      body: combustibleBody,
      theme: "grid",
      headStyles: {
        fillColor: [245, 190, 70],
        textColor: [60, 30, 0],
        fontStyle: "bold",
        fontSize: 6,
        halign: "center",
        cellPadding: 1.5,
      },
      bodyStyles: { fontSize: 5.5, cellPadding: 1.5, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 16, halign: "center" },
        1: { cellWidth: 22 },
        2: { cellWidth: 14, halign: "right" },
        3: { cellWidth: 16, halign: "right" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: "auto", overflow: "linebreak" },
        6: { cellWidth: 28, overflow: "linebreak" },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === combustibleBody.length - 1) {
          data.cell.styles.fillColor = [255, 245, 220];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 6;
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ============== MANTENIMIENTOS TABLE ==============
  if (mantenimientos.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 20, 80);
    doc.text("MANTENIMIENTOS", margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 3;

    const mantBody = mantenimientos
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((m) => [
        m.fecha ? format(new Date(m.fecha), "dd/MM/yy") : "-",
        m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1),
        m.descripcion,
        formatCurrency(m.costoRepuestos),
        formatCurrency(m.costoManoObra),
        formatCurrency(m.costo),
        m.tecnico,
      ]);

    const subtotalMant = mantenimientos.reduce((s, m) => s + m.costo, 0);
    mantBody.push(["", "", "", "", "SUBTOTAL", formatCurrency(subtotalMant), ""]);

    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "Tipo", "Descripción", "Repuestos", "M. Obra", "Total", "Técnico"]],
      body: mantBody,
      theme: "grid",
      headStyles: {
        fillColor: [180, 130, 220],
        textColor: [40, 10, 60],
        fontStyle: "bold",
        fontSize: 6,
        halign: "center",
        cellPadding: 1.5,
      },
      bodyStyles: { fontSize: 5.5, cellPadding: 1.5, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 16, halign: "center" },
        1: { cellWidth: 20 },
        2: { cellWidth: "auto", overflow: "linebreak" },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 20, halign: "right" },
        5: { cellWidth: 22, halign: "right" },
        6: { cellWidth: 25, overflow: "linebreak" },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === mantBody.length - 1) {
          data.cell.styles.fillColor = [240, 230, 250];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 6;
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ============== REMITOS TABLE ==============
  if (remitosDetalle.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 60, 100);
    doc.text("REMITOS / VIAJES", margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 3;

    const remitosBody = remitosDetalle
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((r) => [
        r.fecha ? format(new Date(r.fecha), "dd/MM/yy") : "-",
        r.numero,
        r.tipo_material,
        r.viajes.toString(),
        r.cantidad_total.toLocaleString(),
        r.unidad,
        formatCurrency(r.costo),
        r.operador,
      ]);

    const subtotalRemitos = remitosDetalle.reduce((s, r) => s + r.costo, 0);
    remitosBody.push(["", "", "", "", "", "SUBTOTAL", formatCurrency(subtotalRemitos), ""]);

    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "Nro", "Material", "Viajes", "Cant.", "Unidad", "Costo", "Operador"]],
      body: remitosBody,
      theme: "grid",
      headStyles: {
        fillColor: [100, 160, 230],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6,
        halign: "center",
        cellPadding: 1.5,
      },
      bodyStyles: { fontSize: 5.5, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 16, halign: "center" },
        1: { cellWidth: 18 },
        2: { cellWidth: "auto", overflow: "linebreak" },
        3: { cellWidth: 12, halign: "center" },
        4: { cellWidth: 14, halign: "right" },
        5: { cellWidth: 14, halign: "center" },
        6: { cellWidth: 22, halign: "right" },
        7: { cellWidth: 28, overflow: "linebreak" },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === remitosBody.length - 1) {
          data.cell.styles.fillColor = [220, 235, 250];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 6;
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ============== SUMMARY TABLE ==============
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN FINAL", margin, yPos);
  yPos += 3;

  const resumenBody = [
    ["Combustible / Insumos", `${totales.totalLitros.toLocaleString()} L`, formatCurrency(totales.totalCombustible)],
    ["Mantenimientos", `${totales.totalMantenimientos} servicios`, formatCurrency(totales.costoMantenimientos)],
    ["Remitos / Viajes", `${totales.totalRemitos} remitos - ${totales.totalViajes} viajes`, formatCurrency(totales.costoRemitos)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Categoría", "Detalle", "Total"]],
    body: resumenBody,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: "auto", halign: "center" },
      2: { cellWidth: 35, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    foot: [["GASTO TOTAL", `${kmData.totalKm.toLocaleString()} km recorridos`, formatCurrency(totales.gastoTotal)]],
    footStyles: {
      fillColor: [180, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // ============== FOOTER ==============
  yPos = checkPageBreak(doc, yPos, 12);
  const signatureX = pageWidth / 2;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, signatureX, yPos, { align: "center" });
  yPos += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, signatureX, yPos, { align: "center" });

  // Save PDF
  const fileName = `Gastos_${maquinaria.codigo || "Maquinaria"}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}

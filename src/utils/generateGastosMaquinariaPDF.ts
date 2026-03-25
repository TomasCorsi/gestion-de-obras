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
  cantCargas: number;
}

export interface RendimientoData {
  totalKm: number;
  horasMaquina: number;
  conductores: Array<{ nombre: string; dias: number }>;
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

function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString("es-AR", { maximumFractionDigits: decimals });
}

function safeRatio(numerator: number, denominator: number, decimals = 1): string {
  if (!denominator || denominator === 0) return "-";
  return formatNumber(numerator / denominator, decimals);
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

export async function generateGastosMaquinariaPDF(
  maquinaria: MaquinariaData,
  totales: TotalesData,
  rendimiento: RendimientoData,
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
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text("LIQUIDACIÓN DE MAQUINARIA / VEHÍCULO", margin, yPos);
  doc.setTextColor(0, 0, 0);

  const periodoDesde = fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio";
  const periodoHasta = fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual";
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodoDesde} - ${periodoHasta}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 7;

  // ============== DATOS DEL EQUIPO ==============
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, 18, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL EQUIPO", margin + 2, yPos + 2);
  yPos += 5;

  const col1X = margin + 2;
  const col2X = pageWidth / 3 + 5;
  const col3X = (pageWidth / 3) * 2;

  const drawField = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + doc.getTextWidth(`${label}: `) + 1, y);
  };

  drawField("Código", maquinaria.codigo || "S/C", col1X, yPos);
  drawField("Nombre", maquinaria.nombre || "Sin nombre", col2X, yPos);
  drawField("Patente", maquinaria.patente || "-", col3X, yPos);
  yPos += 4;

  drawField("Tipo", maquinaria.tipo, col1X, yPos);
  drawField("Marca", maquinaria.marca || "-", col2X, yPos);
  drawField("Año", maquinaria.anio?.toString() || "-", col3X, yPos);
  yPos += 4;

  drawField("Estado", estadoLabels[maquinaria.estado] || maquinaria.estado, col1X, yPos);
  drawField("Horas acum.", maquinaria.horas_acumuladas.toLocaleString(), col2X, yPos);
  drawField("KM acum.", maquinaria.km_acumulados.toLocaleString(), col3X, yPos);
  yPos += 8;

  // ============== RESUMEN DE GASTOS (autoTable) ==============
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DE GASTOS", margin, yPos);
  yPos += 3;

  const resumenBody = [
    ["Combustible / Insumos", `${totales.totalLitros.toLocaleString()} L  (${totales.cantCargas} cargas)`, formatCurrency(totales.totalCombustible)],
    ["Mantenimientos", `${totales.totalMantenimientos} servicios`, formatCurrency(totales.costoMantenimientos)],
    ["Remitos / Viajes", `${totales.totalRemitos} remitos - ${totales.totalViajes} viajes`, formatCurrency(totales.costoRemitos)],
  ];

  const categoryColors: [number, number, number][] = [
    [255, 243, 220], // amber light
    [240, 230, 250], // purple light
    [220, 235, 250], // blue light
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
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: "auto", halign: "center" },
      2: { cellWidth: 35, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    foot: [["GASTO TOTAL", "", formatCurrency(totales.gastoTotal)]],
    footStyles: {
      fillColor: [180, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 3,
    },
    didParseCell: (data) => {
      if (data.section === "body" && categoryColors[data.row.index]) {
        data.cell.styles.fillColor = categoryColors[data.row.index];
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // ============== INDICADORES DE RENDIMIENTO ==============
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 80, 60);
  doc.text("INDICADORES DE RENDIMIENTO", margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 3;

  const { totalKm, horasMaquina } = rendimiento;
  const rendimientoBody = [
    ["KM recorridos (período)", `${formatNumber(totalKm, 0)} km`],
    ["Horas máquina (período)", `${formatNumber(horasMaquina, 1)} hs`],
    ["Costo por KM", totalKm > 0 ? formatCurrency(totales.gastoTotal / totalKm) : "-"],
    ["Costo por hora máquina", horasMaquina > 0 ? formatCurrency(totales.gastoTotal / horasMaquina) : "-"],
    ["Litros por KM", safeRatio(totales.totalLitros, totalKm)],
    ["Litros por hora", safeRatio(totales.totalLitros, horasMaquina)],
    ["Costo combustible por KM", totalKm > 0 ? formatCurrency(totales.totalCombustible / totalKm) : "-"],
    ["Promedio litros/carga", totales.cantCargas > 0 ? `${formatNumber(totales.totalLitros / totales.cantCargas)} L` : "-"],
    ["Cantidad de cargas", `${totales.cantCargas}`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Indicador", "Valor"]],
    body: rendimientoBody,
    theme: "striped",
    headStyles: {
      fillColor: [40, 120, 90],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 45, halign: "right" },
    },
    margin: { left: margin, right: margin },
    tableWidth: 105,
  });

  const rendimientoTableEndY = (doc as any).lastAutoTable.finalY;

  // ============== CONDUCTORES DEL PERÍODO (side by side if fits) ==============
  if (rendimiento.conductores.length > 0) {
    const conductoresStartX = margin + 115;
    const conductoresBody = rendimiento.conductores
      .sort((a, b) => b.dias - a.dias)
      .map((c) => [c.nombre, `${c.dias} día${c.dias !== 1 ? "s" : ""}`]);

    autoTable(doc, {
      startY: yPos,
      head: [["Conductor", "Días"]],
      body: conductoresBody,
      theme: "striped",
      headStyles: {
        fillColor: [80, 80, 120],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 2,
      },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 20, halign: "center" },
      },
      margin: { left: conductoresStartX, right: margin },
      tableWidth: 65,
    });

    yPos = Math.max(rendimientoTableEndY, (doc as any).lastAutoTable.finalY) + 10;
  } else {
    yPos = rendimientoTableEndY + 10;
  }

  // ============== FOOTER ==============
  const signatureX = pageWidth / 2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, signatureX, yPos, { align: "center" });
  yPos += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, signatureX, yPos, { align: "center" });

  // Save PDF
  const fileName = `Liquidacion_${maquinaria.codigo || "Maquinaria"}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}

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

export interface GastoDetalle {
  fecha: string;
  tipo: string;
  tipoRaw: string;
  descripcion: string;
  obra: string;
  costo: number;
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

// Category grouping config
interface CategoryConfig {
  key: string;
  label: string;
  headerColor: [number, number, number];
  textColor: [number, number, number];
  matchTypes: string[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "combustible",
    label: "COMBUSTIBLE / INSUMOS",
    headerColor: [245, 190, 70],
    textColor: [100, 60, 0],
    matchTypes: ["combustible"],
  },
  {
    key: "mantenimiento",
    label: "MANTENIMIENTOS",
    headerColor: [180, 130, 220],
    textColor: [60, 20, 80],
    matchTypes: ["mantenimiento"],
  },
  {
    key: "remito",
    label: "REMITOS / VIAJES",
    headerColor: [100, 160, 230],
    textColor: [20, 50, 100],
    matchTypes: ["remito"],
  },
];

function buildGroupedTableData(gastos: GastoDetalle[]): {
  body: string[][];
  categoryRowIndices: number[];
  subtotalRowIndices: number[];
  categoryColors: Map<number, CategoryConfig>;
} {
  const body: string[][] = [];
  const categoryRowIndices: number[] = [];
  const subtotalRowIndices: number[] = [];
  const categoryColors = new Map<number, CategoryConfig>();

  for (const cat of CATEGORIES) {
    const items = gastos
      .filter((g) => cat.matchTypes.includes(g.tipoRaw))
      .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

    if (items.length === 0) continue;

    // Category header row
    const headerIdx = body.length;
    categoryRowIndices.push(headerIdx);
    categoryColors.set(headerIdx, cat);
    body.push([cat.label, "", "", ""]);

    // Data rows
    for (const g of items) {
      body.push([
        g.fecha ? format(new Date(g.fecha), "dd/MM/yy") : "-",
        g.descripcion,
        g.obra,
        formatCurrency(g.costo),
      ]);
    }

    // Subtotal row
    const subtotal = items.reduce((sum, g) => sum + g.costo, 0);
    const subtotalIdx = body.length;
    subtotalRowIndices.push(subtotalIdx);
    categoryColors.set(subtotalIdx, cat);
    body.push(["", `Subtotal ${cat.label.charAt(0) + cat.label.slice(1).toLowerCase()}`, "", formatCurrency(subtotal)]);
  }

  return { body, categoryRowIndices, subtotalRowIndices, categoryColors };
}

export async function generateGastosMaquinariaPDF(
  maquinaria: MaquinariaData,
  totales: TotalesData,
  gastos: GastoDetalle[],
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
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, 18, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DE LA MAQUINARIA", margin + 2, yPos + 2);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  const col1X = margin + 2;
  const col2X = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.text("Código:", col1X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(maquinaria.codigo || "S/C", col1X + 18, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Nombre:", col2X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(maquinaria.nombre || "Sin nombre", col2X + 18, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Tipo:", col1X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(maquinaria.tipo, col1X + 18, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Marca:", col2X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(maquinaria.marca || "-", col2X + 18, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Patente:", col1X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(maquinaria.patente || "-", col1X + 18, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Año:", col2X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(maquinaria.anio?.toString() || "-", col2X + 18, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Estado:", col1X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(estadoLabels[maquinaria.estado] || maquinaria.estado, col1X + 18, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Horas acum.:", col2X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(maquinaria.horas_acumuladas.toLocaleString(), col2X + 25, yPos);
  yPos += 6;

  // ============== PERIOD ==============
  const periodoDesde = fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio";
  const periodoHasta = fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual";
  doc.setFont("helvetica", "bold");
  doc.text(`Período: `, margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${periodoDesde} - ${periodoHasta}`, margin + 18, yPos);
  yPos += 6;

  // ============== EXPENSE SUMMARY ==============
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, 22, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DE GASTOS", margin + 2, yPos + 2);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  doc.text(`Combustible:`, col1X, yPos);
  doc.text(`${formatCurrency(totales.totalCombustible)}  (${totales.totalLitros.toLocaleString()} L)`, col1X + 30, yPos);
  yPos += 4;

  doc.text(`Remitos/Viajes:`, col1X, yPos);
  doc.text(`${formatCurrency(totales.costoRemitos)}  (${totales.totalRemitos} remitos - ${totales.totalViajes} viajes)`, col1X + 30, yPos);
  yPos += 4;

  doc.text(`Mantenimiento:`, col1X, yPos);
  doc.text(`${formatCurrency(totales.costoMantenimientos)}  (${totales.totalMantenimientos} servicios)`, col1X + 30, yPos);
  yPos += 5;

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
  doc.line(margin + 2, yPos - 1, pageWidth - margin - 2, yPos - 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("GASTO TOTAL:", col1X, yPos + 3);
  doc.text(formatCurrency(totales.gastoTotal), col1X + 35, yPos + 3);
  yPos += 8;

  // ============== GROUPED DETAIL TABLE ==============
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE GASTOS", margin, yPos);
  yPos += 3;

  const { body, categoryRowIndices, subtotalRowIndices, categoryColors } = buildGroupedTableData(gastos);

  if (body.length === 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("No hay gastos registrados en el período seleccionado.", margin, yPos + 4);
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "Descripción", "Obra", "Costo"]],
      body,
      theme: "grid",
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6.5,
        halign: "center",
        cellPadding: 1.5,
      },
      bodyStyles: {
        fontSize: 5.5,
        cellPadding: 1.5,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 18, halign: "center" },
        1: { cellWidth: "auto", overflow: "linebreak" },
        2: { cellWidth: 30, overflow: "linebreak" },
        3: { cellWidth: 25, halign: "right" },
      },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const rowIdx = data.row.index;

        // Category header rows
        if (categoryRowIndices.includes(rowIdx)) {
          const cat = categoryColors.get(rowIdx);
          if (cat) {
            data.cell.styles.fillColor = cat.headerColor;
            data.cell.styles.textColor = cat.textColor;
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 7;
            if (data.column.index === 0) {
              data.cell.colSpan = 4;
            }
          }
        }

        // Subtotal rows
        if (subtotalRowIndices.includes(rowIdx)) {
          const cat = categoryColors.get(rowIdx);
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 6;
          if (cat && data.column.index === 1) {
            data.cell.colSpan = 2;
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  }

  // ============== FOOTER ==============
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

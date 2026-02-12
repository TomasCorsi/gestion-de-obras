import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoCalamina from "@/assets/logo-calamina-sur.png";
import firmaPresidente from "@/assets/firma-presidente.png";
import type { Certificado, CertificadoItem } from "@/hooks/useCertificados";

const EMPRESA_INFO = {
  nombre: "CALAMINA SUR S.A.",
  cuit: "30-71457642-5",
  direccion: "CASTEX 499 – Piso: 6° Oficina 601",
  localidad: "(1804) Canning - Pcia. Bs. As.",
  telefono: "11-38537787",
  email: "calamimasur@hotmail.com",
  presidente: "Tognini Gabriel Andres",
  nombreFirma: "Gabriel Tognini",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

interface ImageData {
  base64: string;
  width: number;
  height: number;
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

interface CertificadoPDFData {
  certificado: Certificado;
  items: CertificadoItem[];
  obraNombre: string;
  obraUbicacion?: string;
  /** Map of concepto_id -> categoria name */
  categoriaMap: Record<string, string>;
}

export async function generateCertificadoPDF({
  certificado,
  items,
  obraNombre,
  obraUbicacion,
  categoriaMap,
}: CertificadoPDFData): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = 8;

  // Load images
  let logoData: ImageData | null = null;
  let firmaData: ImageData | null = null;
  try {
    logoData = await loadImageAsBase64(logoCalamina);
  } catch (e) {
    console.warn("Could not load logo:", e);
  }
  try {
    firmaData = await loadImageAsBase64(firmaPresidente);
  } catch (e) {
    console.warn("Could not load firma:", e);
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

  // Divider
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // ============== CERTIFICADO INFO ==============
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text(`CERTIFICADO DE OBRA Nº: ${certificado.numero}`, margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 6;

  // Periodo
  const periodoDate = new Date(certificado.periodo + "-01");
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const periodoLabel = `${meses[periodoDate.getMonth()]} ${periodoDate.getFullYear()}`;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodoLabel}`, margin, yPos);
  if (certificado.fecha_emision) {
    doc.text(`Fecha emisión: ${certificado.fecha_emision}`, pageWidth - margin, yPos, { align: "right" });
  }
  yPos += 6;

  // ============== OBRA INFO ==============
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 3, pageWidth - margin * 2, 10, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Obra:", margin + 2, yPos + 2);
  doc.setFont("helvetica", "normal");
  doc.text(obraNombre, margin + 14, yPos + 2);

  if (obraUbicacion) {
    doc.setFont("helvetica", "bold");
    doc.text("Ubicación:", margin + 2, yPos + 6);
    doc.setFont("helvetica", "normal");
    doc.text(obraUbicacion, margin + 22, yPos + 6);
  }

  yPos += 12;

  // ============== ITEMS TABLE GROUPED BY CATEGORY ==============
  // Group items by category
  const itemsByCategory = new Map<string, CertificadoItem[]>();

  items.forEach((item) => {
    const cat = (item.concepto_id && categoriaMap[item.concepto_id]) || "General";
    if (!itemsByCategory.has(cat)) {
      itemsByCategory.set(cat, []);
    }
    itemsByCategory.get(cat)!.push(item);
  });

  // Build table data
  const tableData: any[] = [];

  const sortedCategories = [...itemsByCategory.keys()].sort();

  sortedCategories.forEach((catName) => {
    const catItems = itemsByCategory.get(catName) || [];
    if (catItems.length === 0) return;

    // Category header
    tableData.push([
      {
        content: catName.toUpperCase(),
        colSpan: 5,
        styles: {
          fontStyle: "bold",
          fillColor: [220, 220, 220],
          fontSize: 7,
          cellPadding: 2,
        },
      },
    ]);

    // Items
    catItems.forEach((item) => {
      tableData.push([
        item.descripcion,
        item.unidad,
        item.cantidad.toLocaleString("es-AR"),
        formatCurrency(item.precio_unitario),
        formatCurrency(item.subtotal),
      ]);
    });

    // Category subtotal
    const catSubtotal = catItems.reduce((s, i) => s + i.subtotal, 0);
    tableData.push([
      { content: "", colSpan: 3 },
      {
        content: `Subtotal ${catName}:`,
        styles: { fontStyle: "bold", halign: "right", fontSize: 7 },
      },
      {
        content: formatCurrency(catSubtotal),
        styles: { fontStyle: "bold", fontSize: 7 },
      },
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Concepto", "Un.", "Cantidad", "P. Unitario", "Subtotal"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // ============== TOTALS ==============
  const totalsStartX = pageWidth - margin - 60;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsStartX, yPos);
  doc.text(formatCurrency(certificado.subtotal), pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  doc.text("IVA (21%):", totalsStartX, yPos);
  doc.text(formatCurrency(certificado.iva), pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setFillColor(245, 245, 245);
  doc.rect(totalsStartX - 3, yPos - 4, 66, 8, "F");
  doc.text("TOTAL:", totalsStartX, yPos + 1);
  doc.text(formatCurrency(certificado.total), pageWidth - margin, yPos + 1, { align: "right" });
  yPos += 10;

  // ============== OBSERVACIONES ==============
  if (certificado.observaciones) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES:", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(certificado.observaciones, pageWidth - margin * 2);
    doc.text(obsLines, margin, yPos);
    yPos += obsLines.length * 3 + 4;
  }

  // ============== FIRMA ==============
  const signatureX = pageWidth / 2;

  if (firmaData) {
    const firmaWidth = 30;
    const firmaAspectRatio = firmaData.height / firmaData.width;
    const firmaHeight = firmaWidth * firmaAspectRatio;
    doc.addImage(firmaData.base64, "PNG", signatureX - firmaWidth / 2, yPos, firmaWidth, firmaHeight);
    yPos += firmaHeight + 1;
  } else {
    yPos += 10;
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, signatureX, yPos, { align: "center" });
  yPos += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(
    `CUIT: ${EMPRESA_INFO.cuit} | ${EMPRESA_INFO.presidente.toUpperCase()} - PRESIDENTE`,
    signatureX,
    yPos,
    { align: "center" }
  );

  // Save
  doc.save(`Certificado_${certificado.numero}.pdf`);
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoCalamina from "@/assets/logo-calamina-sur.png";
import firmaPresidente from "@/assets/firma-presidente.png";
import type { Certificado, CertificadoItem, AcumuladoConcepto } from "@/hooks/useCertificados";

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

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
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
        resolve({ base64: canvas.toDataURL("image/png"), width: img.width, height: img.height });
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
  clienteNombre?: string;
  clienteCuit?: string;
  categoriaMap: Record<string, string>;
  etapaMap?: Record<string, string>;
  cantidadTotalMap?: Record<string, number>;
  acumulados?: AcumuladoConcepto[];
}

async function renderHeader(doc: jsPDF, margin: number, pageWidth: number): Promise<number> {
  let yPos = 8;
  let logoData: ImageData | null = null;
  try { logoData = await loadImageAsBase64(logoCalamina); } catch (e) { console.warn("Could not load logo:", e); }

  if (logoData) {
    const logoWidth = 35;
    const logoAspectRatio = logoData.height / logoData.width;
    doc.addImage(logoData.base64, "PNG", margin, yPos, logoWidth, logoWidth * logoAspectRatio);
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
  return yPos;
}

function renderCertInfo(
  doc: jsPDF, margin: number, pageWidth: number, yPos: number,
  certificado: Certificado, obraNombre: string, obraUbicacion?: string, clienteNombre?: string, clienteCuit?: string
): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text(`CERTIFICADO DE OBRA Nº: ${certificado.numero}`, margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 6;

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

  // Tipo badge
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const tipoLabel = certificado.tipo === "obra" ? "TIPO: OBRA (CON ACUMULADOS)" : "TIPO: SERVICIO";
  doc.text(tipoLabel, margin, yPos);
  yPos += 5;

  const infoBoxHeight = (obraUbicacion ? 4 : 0) + (clienteNombre ? 4 : 0) + 10;
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 3, pageWidth - margin * 2, infoBoxHeight, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Obra:", margin + 2, yPos + 2);
  doc.setFont("helvetica", "normal");
  doc.text(obraNombre, margin + 14, yPos + 2);

  let infoY = yPos + 2;
  if (obraUbicacion) {
    infoY += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Ubicación:", margin + 2, infoY);
    doc.setFont("helvetica", "normal");
    doc.text(obraUbicacion, margin + 22, infoY);
  }
  if (clienteNombre) {
    infoY += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", margin + 2, infoY);
    doc.setFont("helvetica", "normal");
    const clienteText = clienteCuit ? `${clienteNombre} (CUIT: ${clienteCuit})` : clienteNombre;
    doc.text(clienteText, margin + 17, infoY);
  }

  return yPos + infoBoxHeight + 2;
}

async function renderFirma(doc: jsPDF, pageWidth: number, yPos: number): Promise<number> {
  let firmaData: ImageData | null = null;
  try { firmaData = await loadImageAsBase64(firmaPresidente); } catch (e) { console.warn("Could not load firma:", e); }

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
    signatureX, yPos, { align: "center" }
  );
  return yPos;
}

// ============== SERVICIO PDF (original format) ==============

function generateServicioPDF(
  doc: jsPDF, yPos: number, margin: number, pageWidth: number,
  certificado: Certificado, items: CertificadoItem[], categoriaMap: Record<string, string>
): number {
  const itemsByCategory = new Map<string, CertificadoItem[]>();
  items.forEach((item) => {
    const cat = (item.concepto_id && categoriaMap[item.concepto_id]) || "General";
    if (!itemsByCategory.has(cat)) itemsByCategory.set(cat, []);
    itemsByCategory.get(cat)!.push(item);
  });

  const tableData: any[] = [];
  const sortedCategories = [...itemsByCategory.keys()].sort();

  sortedCategories.forEach((catName) => {
    const catItems = itemsByCategory.get(catName) || [];
    if (catItems.length === 0) return;

    tableData.push([{
      content: catName.toUpperCase(),
      colSpan: 5,
      styles: { fontStyle: "bold", fillColor: [220, 220, 220], fontSize: 7, cellPadding: 2 },
    }]);

    catItems.forEach((item) => {
      tableData.push([
        item.descripcion,
        item.unidad,
        item.cantidad.toLocaleString("es-AR"),
        formatCurrency(item.precio_unitario),
        formatCurrency(item.subtotal),
      ]);
    });

    const catSubtotal = catItems.reduce((s, i) => s + i.subtotal, 0);
    tableData.push([
      { content: "", colSpan: 3 },
      { content: `Subtotal ${catName}:`, styles: { fontStyle: "bold", halign: "right", fontSize: 7 } },
      { content: formatCurrency(catSubtotal), styles: { fontStyle: "bold", fontSize: 7 } },
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Concepto", "Un.", "Cantidad", "P. Unitario", "Subtotal"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7, halign: "center", cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
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

  // Totals
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

  return yPos;
}

// ============== OBRA PDF (with acumulados) ==============

function generateObraPDF(
  doc: jsPDF, yPos: number, margin: number, pageWidth: number,
  certificado: Certificado, items: CertificadoItem[],
  etapaMap: Record<string, string>, cantidadTotalMap: Record<string, number>,
  acumulados: AcumuladoConcepto[]
): number {
  // Use landscape-like layout with smaller fonts
  // Group by etapa
  const itemsByEtapa = new Map<string, CertificadoItem[]>();
  items.forEach((item) => {
    const etapa = item.etapa || (item.concepto_id && etapaMap[item.concepto_id]) || "General";
    if (!itemsByEtapa.has(etapa)) itemsByEtapa.set(etapa, []);
    itemsByEtapa.get(etapa)!.push(item);
  });

  const tableData: any[] = [];
  const sortedEtapas = [...itemsByEtapa.keys()].sort();

  let totalAvAnterior = 0;
  let totalAvActual = 0;
  let totalAvAcumulado = 0;

  sortedEtapas.forEach((etapaName) => {
    const etapaItems = itemsByEtapa.get(etapaName) || [];
    if (etapaItems.length === 0) return;

    tableData.push([{
      content: etapaName.toUpperCase(),
      colSpan: 10,
      styles: { fontStyle: "bold", fillColor: [220, 220, 220], fontSize: 6, cellPadding: 2 },
    }]);

    etapaItems.forEach((item) => {
      const ac = acumulados.find((a) => a.concepto_id === item.concepto_id) || { cantidad_anterior: 0, avance_anterior: 0 };
      const cantTotal = (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0;
      const valorTotal = cantTotal * item.precio_unitario;
      const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
      const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
      const pctAcumulado = pctAnterior + pctActual;
      const avAnterior = ac.avance_anterior;
      const avActual = item.subtotal;
      const avAcumulado = avAnterior + avActual;

      totalAvAnterior += avAnterior;
      totalAvActual += avActual;
      totalAvAcumulado += avAcumulado;

      tableData.push([
        item.descripcion,
        `${formatCurrency(item.precio_unitario)}`,
        cantTotal > 0 ? cantTotal.toLocaleString("es-AR") : "-",
        formatCurrency(valorTotal),
        formatPercent(pctAnterior),
        formatPercent(pctActual),
        formatPercent(pctAcumulado),
        formatCurrency(avAnterior),
        formatCurrency(avActual),
        formatCurrency(avAcumulado),
      ]);
    });
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Concepto", "V. Unit.", "Cant. Tot.", "V. Total", "% Ant.", "% Act.", "% Acum.", "Av. Ant.", "Av. Act.", "Av. Acum."]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 5.5, halign: "center", cellPadding: 1.5 },
    bodyStyles: { fontSize: 5.5, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 18, halign: "right" },
      2: { cellWidth: 16, halign: "right" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 14, halign: "right" },
      5: { cellWidth: 14, halign: "right" },
      6: { cellWidth: 14, halign: "right" },
      7: { cellWidth: 20, halign: "right" },
      8: { cellWidth: 20, halign: "right" },
      9: { cellWidth: 20, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Totals for obra
  const totalsStartX = pageWidth - margin - 70;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  doc.text("Avance Anterior:", totalsStartX, yPos);
  doc.text(formatCurrency(totalAvAnterior), pageWidth - margin, yPos, { align: "right" });
  yPos += 4;

  doc.text("Avance Actual:", totalsStartX, yPos);
  doc.text(formatCurrency(totalAvActual), pageWidth - margin, yPos, { align: "right" });
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Avance Acumulado:", totalsStartX, yPos);
  doc.text(formatCurrency(totalAvAcumulado), pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  if (certificado.anticipo_porcentaje > 0) {
    doc.setFont("helvetica", "normal");
    const anticipoMonto = Math.round(totalAvAcumulado * (certificado.anticipo_porcentaje / 100));
    doc.text(`Anticipo (${certificado.anticipo_porcentaje}%):`, totalsStartX, yPos);
    doc.text(`- ${formatCurrency(anticipoMonto)}`, pageWidth - margin, yPos, { align: "right" });
    yPos += 4;
  }

  doc.setFont("helvetica", "normal");
  doc.text("IVA (21%):", totalsStartX, yPos);
  doc.text(formatCurrency(certificado.iva), pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setFillColor(245, 245, 245);
  doc.rect(totalsStartX - 3, yPos - 4, 76, 8, "F");
  doc.text("TOTAL:", totalsStartX, yPos + 1);
  doc.text(formatCurrency(certificado.total), pageWidth - margin, yPos + 1, { align: "right" });
  yPos += 10;

  return yPos;
}

export async function generateCertificadoPDF({
  certificado,
  items,
  obraNombre,
  obraUbicacion,
  clienteNombre,
  clienteCuit,
  categoriaMap,
  etapaMap = {},
  cantidadTotalMap = {},
  acumulados = [],
}: CertificadoPDFData): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  let yPos = await renderHeader(doc, margin, pageWidth);
  yPos = renderCertInfo(doc, margin, pageWidth, yPos, certificado, obraNombre, obraUbicacion, clienteNombre, clienteCuit);

  if (certificado.tipo === "obra") {
    yPos = generateObraPDF(doc, yPos, margin, pageWidth, certificado, items, etapaMap, cantidadTotalMap, acumulados);
  } else {
    yPos = generateServicioPDF(doc, yPos, margin, pageWidth, certificado, items, categoriaMap);
  }

  // Observaciones
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

  // Firma
  await renderFirma(doc, pageWidth, yPos);

  doc.save(`Certificado_${certificado.numero}.pdf`);
}

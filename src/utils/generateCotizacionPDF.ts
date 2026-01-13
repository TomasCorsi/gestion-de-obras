import jsPDF from "jspdf";
import "jspdf-autotable";
import logoCalamina from "@/assets/logo-calamina-sur.png";
import firmaPresidente from "@/assets/firma-presidente.png";
import { 
  CotizacionWithRelations, 
  CotizacionCategoriaDB, 
  CotizacionItemDB 
} from "@/hooks/useCotizaciones";

// Extend jsPDF type for autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

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

const NOTAS_DEFAULT = `Validez de la Oferta: 10 días Corridos
Cláusula de Ajuste: 100% CAC
Forma de pago: Anticipo 30% al inicio de obra, resto según certificación de avance de obra

Terminaciones a Maquina. No se Realizan Trabajos manuales ni parquización
No incluye gestiones municipales ni pagos de aranceles por luz y agua de obra ante los entes correspondientes.
La energía y Agua de obra deberan ser provistas por el comitente a pie de obra.
Movimiento de suelo. Excavaciones y fundaciones sujetas a modificación y posterior recotización de acuerdo a estudio de suelo, planimetria y niveles definitivos a proveer por comitente.`;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals = 2): string {
  if (!value || value === 0) return "-";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

async function loadImageAsBase64(url: string): Promise<string> {
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
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateCotizacionPDF(
  cotizacion: CotizacionWithRelations,
  obraNombre?: string
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Load images
  let logoBase64 = "";
  let firmaBase64 = "";
  try {
    logoBase64 = await loadImageAsBase64(logoCalamina);
  } catch (e) {
    console.warn("Could not load logo:", e);
  }
  try {
    firmaBase64 = await loadImageAsBase64(firmaPresidente);
  } catch (e) {
    console.warn("Could not load firma:", e);
  }

  // ============== HEADER ==============
  // Logo
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, yPos, 40, 20);
  }

  // Company info (right side)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, pageWidth - margin, yPos + 4, { align: "right" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`CUIT: ${EMPRESA_INFO.cuit}`, pageWidth - margin, yPos + 10, { align: "right" });
  doc.text(EMPRESA_INFO.direccion, pageWidth - margin, yPos + 15, { align: "right" });
  doc.text(EMPRESA_INFO.localidad, pageWidth - margin, yPos + 20, { align: "right" });
  doc.text(`Cel: ${EMPRESA_INFO.telefono}`, pageWidth - margin, yPos + 25, { align: "right" });
  doc.text(EMPRESA_INFO.email, pageWidth - margin, yPos + 30, { align: "right" });

  yPos += 38;

  // Divider line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ============== COTIZACIÓN INFO ==============
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text(`COTIZACIÓN Nº: ${cotizacion.numero}`, margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${cotizacion.fecha_creacion}`, margin, yPos);
  doc.text(`Vence: ${cotizacion.fecha_vencimiento}`, margin + 60, yPos);
  yPos += 8;

  // ============== OBRA INFO ==============
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 4, pageWidth - margin * 2, 14, "F");
  
  doc.setFont("helvetica", "bold");
  doc.text("Obra:", margin + 2, yPos + 2);
  doc.setFont("helvetica", "normal");
  doc.text(obraNombre || cotizacion.obra?.nombre || "Sin asignar", margin + 18, yPos + 2);
  
  doc.setFont("helvetica", "bold");
  doc.text("Responsable:", margin + 2, yPos + 7);
  doc.setFont("helvetica", "normal");
  doc.text(cotizacion.responsable, margin + 32, yPos + 7);
  yPos += 16;

  // ============== DESCRIPCIÓN ==============
  if (cotizacion.descripcion) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const descripcionLines = doc.splitTextToSize(cotizacion.descripcion, pageWidth - margin * 2);
    doc.text(descripcionLines, margin, yPos);
    yPos += descripcionLines.length * 4 + 4;
  }

  // ============== ITEMS TABLE ==============
  const categorias = cotizacion.categorias || [];
  const items = cotizacion.items || [];

  // Group items by category
  const itemsByCategory = new Map<string | null, CotizacionItemDB[]>();
  
  items.forEach((item) => {
    const catId = item.categoria_id;
    if (!itemsByCategory.has(catId)) {
      itemsByCategory.set(catId, []);
    }
    itemsByCategory.get(catId)!.push(item);
  });

  // Build table data
  const tableData: any[] = [];
  let rowIndex = 0;
  const categoryRows: number[] = [];
  const subtotalRows: number[] = [];

  // Sort categories by numero
  const sortedCategories = [...categorias].sort((a, b) => a.numero - b.numero);

  sortedCategories.forEach((cat) => {
    // Category header row
    categoryRows.push(rowIndex);
    tableData.push([
      { content: `${cat.numero}`, styles: { fontStyle: "bold", fillColor: [230, 230, 230] } },
      { content: cat.nombre.toUpperCase(), colSpan: 7, styles: { fontStyle: "bold", fillColor: [230, 230, 230] } },
    ]);
    rowIndex++;

    // Category items
    const catItems = itemsByCategory.get(cat.id) || [];
    let categorySubtotal = 0;
    
    catItems.forEach((item) => {
      const itemTotal = item.total || item.subtotal;
      categorySubtotal += itemTotal;
      
      tableData.push([
        item.numero || "",
        item.descripcion,
        item.unidad.toUpperCase(),
        formatNumber(item.cantidad_m2 || 0),
        formatNumber(item.altura_promedio || 0),
        formatNumber(item.cantidad_m3 || 0),
        formatCurrency(item.precio_unitario),
        formatCurrency(itemTotal),
      ]);
      rowIndex++;
    });

    // Category subtotal row
    if (catItems.length > 0) {
      subtotalRows.push(rowIndex);
      tableData.push([
        { content: "", colSpan: 6 },
        { content: `Subtotal ${cat.nombre}:`, styles: { fontStyle: "bold", halign: "right" } },
        { content: formatCurrency(categorySubtotal), styles: { fontStyle: "bold" } },
      ]);
      rowIndex++;
    }
  });

  // Uncategorized items
  const uncategorizedItems = itemsByCategory.get(null) || [];
  if (uncategorizedItems.length > 0) {
    uncategorizedItems.forEach((item) => {
      const itemTotal = item.total || item.subtotal;
      tableData.push([
        item.numero || "",
        item.descripcion,
        item.unidad.toUpperCase(),
        formatNumber(item.cantidad_m2 || 0),
        formatNumber(item.altura_promedio || 0),
        formatNumber(item.cantidad_m3 || 0),
        formatCurrency(item.precio_unitario),
        formatCurrency(itemTotal),
      ]);
      rowIndex++;
    });
  }

  // Generate table
  doc.autoTable({
    startY: yPos,
    head: [["Núm", "Descripción", "Un.", "Cant", "Altura", "M³", "P. Unit.", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 15, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 25, halign: "right" },
      7: { cellWidth: 25, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  yPos = doc.lastAutoTable.finalY + 5;

  // ============== TOTALS ==============
  const totalsStartX = pageWidth - margin - 70;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsStartX, yPos);
  doc.text(formatCurrency(cotizacion.subtotal), pageWidth - margin, yPos, { align: "right" });
  yPos += 6;

  doc.text("IVA (21%):", totalsStartX, yPos);
  doc.text(formatCurrency(cotizacion.iva), pageWidth - margin, yPos, { align: "right" });
  yPos += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setFillColor(245, 245, 245);
  doc.rect(totalsStartX - 5, yPos - 5, 75, 10, "F");
  doc.text("TOTAL:", totalsStartX, yPos);
  doc.text(formatCurrency(cotizacion.total), pageWidth - margin, yPos, { align: "right" });
  yPos += 15;

  // Check if we need a new page
  const remainingSpace = pageHeight - yPos - margin;
  if (remainingSpace < 80) {
    doc.addPage();
    yPos = margin;
  }

  // ============== NOTAS ==============
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("NOTAS Y CONDICIONES:", margin, yPos);
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const notas = cotizacion.notas || NOTAS_DEFAULT;
  const notasLines = doc.splitTextToSize(notas, pageWidth - margin * 2);
  doc.text(notasLines, margin, yPos);
  yPos += notasLines.length * 3.5 + 10;

  // Check if we need a new page for signature
  if (pageHeight - yPos < 60) {
    doc.addPage();
    yPos = margin;
  }

  // ============== FIRMA ==============
  const signatureX = pageWidth / 2;
  
  // Signature image
  if (firmaBase64) {
    doc.addImage(firmaBase64, "PNG", signatureX - 25, yPos, 50, 25);
    yPos += 28;
  } else {
    yPos += 20;
  }

  // Signature text
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, signatureX, yPos, { align: "center" });
  yPos += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`CUIT: ${EMPRESA_INFO.cuit}`, signatureX, yPos, { align: "center" });
  yPos += 4;
  doc.text(EMPRESA_INFO.presidente.toUpperCase(), signatureX, yPos, { align: "center" });
  yPos += 4;
  doc.text("PRESIDENTE", signatureX, yPos, { align: "center" });
  yPos += 8;
  
  doc.setFont("helvetica", "italic");
  doc.text("Saluda Atte-", signatureX, yPos, { align: "center" });
  yPos += 4;
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombreFirma, signatureX, yPos, { align: "center" });

  // ============== PAGE NUMBERS ==============
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // Save PDF
  doc.save(`Cotizacion_${cotizacion.numero}.pdf`);
}

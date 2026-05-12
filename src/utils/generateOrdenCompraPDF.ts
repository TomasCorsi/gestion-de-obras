import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoCalamina from "@/assets/logo-calamina-sur.png";
import { OrdenCompraWithRelations } from "@/hooks/useOrdenesCompra";
import { formatDate } from "@/lib/utils";

const EMPRESA_INFO = {
  nombre: "CALAMINA SUR S.A.",
  cuit: "30-71457642-5",
  direccion: "CASTEX 499 – Piso: 6° Oficina 601",
  localidad: "(1804) Canning - Pcia. Bs. As.",
  telefono: "11-38537787",
  email: "calamimasur@hotmail.com",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function loadImageAsBase64(url: string): Promise<{ base64: string; width: number; height: number }> {
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
      } else reject(new Error("ctx"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateOrdenCompraPDF(orden: OrdenCompraWithRelations): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let yPos = 10;

  // Logo
  let logoData = null;
  try {
    logoData = await loadImageAsBase64(logoCalamina);
  } catch (e) {
    console.warn("No logo:", e);
  }
  if (logoData) {
    const logoWidth = 38;
    const logoHeight = logoWidth * (logoData.height / logoData.width);
    doc.addImage(logoData.base64, "PNG", margin, yPos, logoWidth, logoHeight);
  }

  // Empresa info (right)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, pageWidth - margin, yPos + 4, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`CUIT: ${EMPRESA_INFO.cuit}`, pageWidth - margin, yPos + 8, { align: "right" });
  doc.text(EMPRESA_INFO.direccion, pageWidth - margin, yPos + 12, { align: "right" });
  doc.text(EMPRESA_INFO.localidad, pageWidth - margin, yPos + 16, { align: "right" });
  doc.text(`Tel: ${EMPRESA_INFO.telefono} | ${EMPRESA_INFO.email}`, pageWidth - margin, yPos + 20, { align: "right" });

  yPos += 26;

  doc.setDrawColor(176, 0, 32);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(176, 0, 32);
  doc.text(`ORDEN DE COMPRA Nº ${orden.numero}`, margin, yPos);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${formatDate(orden.fecha)}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 7;

  // Proveedor block
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - margin * 2, 24, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PROVEEDOR", margin + 2, yPos + 4);
  doc.setFont("helvetica", "normal");
  const prov = orden.proveedor;
  doc.text(prov?.nombre || "-", margin + 2, yPos + 9);
  if (prov?.cuit) doc.text(`CUIT: ${prov.cuit}`, margin + 2, yPos + 13);
  if (prov?.direccion) doc.text(`${prov.direccion}${prov.localidad ? ", " + prov.localidad : ""}`, margin + 2, yPos + 17);
  if (prov?.telefono || prov?.email) doc.text(`${prov.telefono || ""}${prov.telefono && prov.email ? "  |  " : ""}${prov.email || ""}`, margin + 2, yPos + 21);

  // Obra block (right side)
  if (orden.obra) {
    doc.setFont("helvetica", "bold");
    doc.text("OBRA DESTINO", pageWidth / 2 + 4, yPos + 4);
    doc.setFont("helvetica", "normal");
    doc.text(orden.obra.nombre, pageWidth / 2 + 4, yPos + 9);
    if (orden.obra.numero) doc.text(`N° ${orden.obra.numero}`, pageWidth / 2 + 4, yPos + 13);
  }
  yPos += 28;

  // Items table
  const items = (orden.items || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const body = items.map((it, i) => [
    String(i + 1),
    it.descripcion,
    it.unidad,
    Number(it.cantidad).toLocaleString("es-AR", { maximumFractionDigits: 2 }),
    formatCurrency(it.precio_unitario),
    formatCurrency((it.cantidad || 0) * (it.precio_unitario || 0)),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Descripción", "Unidad", "Cantidad", "P. Unitario", "Subtotal"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // Totales
  const totalsX = pageWidth - margin - 65;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, yPos);
  doc.text(formatCurrency(orden.subtotal), pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  if (orden.incluir_iva) {
    doc.text("IVA 21%:", totalsX, yPos);
    doc.text(formatCurrency(orden.iva), pageWidth - margin, yPos, { align: "right" });
    yPos += 5;
  }

  doc.setFillColor(176, 0, 32);
  doc.setTextColor(255, 255, 255);
  doc.rect(totalsX - 3, yPos - 4, pageWidth - margin - (totalsX - 3), 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", totalsX, yPos + 1);
  doc.text(formatCurrency(orden.total), pageWidth - margin, yPos + 1, { align: "right" });
  doc.setTextColor(0, 0, 0);
  yPos += 12;

  // Condiciones / entrega / observaciones
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  if (orden.condiciones_pago) {
    doc.text("Condiciones de pago:", margin, yPos);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(orden.condiciones_pago, pageWidth - margin * 2);
    doc.text(lines, margin, yPos + 4);
    yPos += 4 + lines.length * 4 + 2;
    doc.setFont("helvetica", "bold");
  }
  if (orden.fecha_entrega_estimada) {
    doc.text(`Fecha de entrega estimada: `, margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(orden.fecha_entrega_estimada), margin + 50, yPos);
    yPos += 5;
    doc.setFont("helvetica", "bold");
  }
  if (orden.observaciones) {
    doc.text("Observaciones:", margin, yPos);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(orden.observaciones, pageWidth - margin * 2);
    doc.text(lines, margin, yPos + 4);
    yPos += 4 + lines.length * 4 + 2;
  }

  doc.save(`OrdenCompra_${orden.numero}.pdf`);
}

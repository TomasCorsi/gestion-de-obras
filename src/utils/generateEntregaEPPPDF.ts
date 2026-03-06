import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { EntregaEPPItem } from "@/hooks/useEntregasEPP";
import type { PersonalDB } from "@/hooks/usePersonal";

const ROL_LABELS: Record<string, string> = {
  capataz: "Capataz",
  maquinista: "Maquinista",
  chofer: "Chofer",
  administrativo: "Administrativo",
  ayudante: "Ayudante",
  sereno: "Sereno",
  mecanico: "Mecánico",
  topografo: "Topógrafo",
  repartidor_calecita: "Repartidor Calecita",
};

interface EPPPDFData {
  personal: PersonalDB;
  items: EntregaEPPItem[];
  fecha: string;
}

export async function generateEntregaEPPPDF({ personal, items, fecha }: EPPPDFData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  const boxW = pageW - margin * 2;
  let y = 10;

  const fechaFormatted = new Date(fecha + "T12:00:00").toLocaleDateString("es-AR");
  const rolLabel = ROL_LABELS[personal.rol] || personal.rol;
  const productNames = items.map((i) => i.producto).join(", ");

  // --- Top right: Resolución ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Resolución 299/11, Anexo I", pageW - margin, y + 2, { align: "right" });

  // --- Title bar ---
  y += 5;
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, boxW, 7, "F");
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, boxW, 7);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ENTREGA DE ROPA DE TRABAJO Y ELEMENTOS DE PROTECCIÓN PERSONAL", pageW / 2, y + 5, { align: "center" });
  y += 7;

  // --- Company data rows ---
  const rowH = 6;
  const fs = 8;

  // Row 1: Razón Social + CUIT
  doc.rect(margin, y, boxW, rowH);
  doc.setFontSize(fs);
  doc.setFont("helvetica", "normal");
  const midX = margin + boxW * 0.65;
  doc.line(midX, y, midX, y + rowH);
  drawField(doc, margin + 2, y + 4.5, "(1)", "Razón Social:", "CALAMINA SUR S.A", fs);
  drawField(doc, midX + 2, y + 4.5, "(2)", "C.U.I.T.:", "30-71457642-5", fs);
  y += rowH;

  // Row 2: Dirección + Localidad + CP + Provincia
  doc.rect(margin, y, boxW, rowH);
  const col2 = margin + boxW * 0.35;
  const col3 = margin + boxW * 0.55;
  const col4 = margin + boxW * 0.7;
  doc.line(col2, y, col2, y + rowH);
  doc.line(col3, y, col3, y + rowH);
  doc.line(col4, y, col4, y + rowH);
  drawField(doc, margin + 2, y + 4.5, "(3)", "Dirección:", "MARIANO CASTEX 499", fs);
  drawField(doc, col2 + 2, y + 4.5, "(4)", "Localidad:", "CANNING", fs);
  drawField(doc, col3 + 2, y + 4.5, "(5)", "C.P.:", "1804", fs);
  drawField(doc, col4 + 2, y + 4.5, "(6)", "Provincia:", "BUENOS AIRES", fs);
  y += rowH;

  // Row 3: Nombre + DNI
  doc.rect(margin, y, boxW, rowH);
  const dniCol = margin + boxW * 0.7;
  doc.line(dniCol, y, dniCol, y + rowH);
  const fullName = `${personal.apellido || ""} ${personal.nombre || ""}`.trim().toUpperCase();
  drawField(doc, margin + 2, y + 4.5, "(7)", "Nombre y Apellido del Trabajador:", fullName, fs);
  drawField(doc, dniCol + 2, y + 4.5, "(8)", "D.N.I.:", personal.dni || "-", fs);
  y += rowH;

  // Row 4: Puesto + Descripción EPP
  const row4H = 14;
  doc.rect(margin, y, boxW, row4H);
  const descCol = margin + boxW * 0.35;
  doc.line(descCol, y, descCol, y + row4H);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("(9)", margin + 2, y + 4);
  doc.text("Descripción breve del puesto/s de trabajo en el/los cuales se desempeña el trabajador:", margin + 7, y + 4);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(rolLabel, margin + 5, y + 10);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("(10)", descCol + 2, y + 4);
  doc.text("Elementos de protección personal, necesarios para el trabajador, según el puesto de trabajo:", descCol + 9, y + 4);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const descLines = doc.splitTextToSize(productNames + ".", boxW * 0.65 - 10);
  doc.text(descLines, descCol + 5, y + 9);
  y += row4H;

  // --- Items table ---
  y += 1;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        { content: "", styles: { cellWidth: 8 } },
        { content: "(11)\nProducto", styles: { cellWidth: 38 } },
        { content: "(12)\nTipo // Modelo", styles: { cellWidth: 50 } },
        { content: "(13)\nMarca", styles: { cellWidth: 35 } },
        { content: "(14) Posee\ncertificación\nSI // NO", styles: { cellWidth: 22, halign: "center" } },
        { content: "(15)\nCantidad", styles: { cellWidth: 20, halign: "center" } },
        { content: "(16)\nFecha de entrega", styles: { cellWidth: 30, halign: "center" } },
        { content: "(17)\nFirma del trabajador", styles: { cellWidth: 50 } },
      ],
    ],
    body: items.map((item, i) => [
      (i + 1).toString(),
      item.producto.toUpperCase(),
      (item.tipo_modelo || "").toUpperCase(),
      (item.marca || "").toUpperCase(),
      item.posee_certificacion ? "SI" : "NO",
      item.cantidad.toString(),
      fechaFormatted,
      "",
    ]),
    styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.3 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 7, fontStyle: "bold", lineColor: [0, 0, 0], lineWidth: 0.3 },
    bodyStyles: { textColor: [0, 0, 0] },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
    },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // --- Signature blocks ---
  const pageH = doc.internal.pageSize.getHeight();
  const sigY = Math.min(Math.max(y, pageH - 40), pageH - 25);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.line(margin, sigY, margin + 70, sigY);
  doc.text("Firma y aclaración del Empleador", margin, sigY + 4);

  doc.line(pageW - margin - 70, sigY, pageW - margin, sigY);
  doc.text("Firma y aclaración del Trabajador", pageW - margin - 70, sigY + 4);

  doc.save(`EPP_${personal.apellido || "empleado"}_${personal.nombre || ""}_${fecha}.pdf`);
}

function drawField(doc: jsPDF, x: number, y: number, num: string, label: string, value: string, fs: number) {
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text(num, x, y);
  const numW = doc.getTextWidth(num) + 1;
  doc.setFontSize(fs);
  doc.setFont("helvetica", "bold");
  doc.text(label, x + numW, y);
  const labelW = doc.getTextWidth(label) + 2;
  doc.setFont("helvetica", "normal");
  doc.text(value, x + numW + labelW, y);
}

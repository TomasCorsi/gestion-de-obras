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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // Title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ENTREGA DE ROPA DE TRABAJO Y", pageW / 2, y, { align: "center" });
  y += 5;
  doc.text("ELEMENTOS DE PROTECCIÓN PERSONAL", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Resolución 299/11, Anexo I", pageW / 2, y, { align: "center" });
  y += 8;

  // Company data box
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  const boxW = pageW - margin * 2;
  doc.rect(margin, y, boxW, 28);

  doc.setFontSize(8);
  const col1 = margin + 3;
  const col2 = margin + boxW / 2 + 3;
  let by = y + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Razón Social:", col1, by);
  doc.setFont("helvetica", "normal");
  doc.text("CALAMINA SUR S.R.L.", col1 + 28, by);

  doc.setFont("helvetica", "bold");
  doc.text("CUIT:", col2, by);
  doc.setFont("helvetica", "normal");
  doc.text("30-71811533-0", col2 + 12, by);

  by += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Dirección:", col1, by);
  doc.setFont("helvetica", "normal");
  doc.text("Av. del Libertador 1000", col1 + 22, by);

  doc.setFont("helvetica", "bold");
  doc.text("Localidad:", col2, by);
  doc.setFont("helvetica", "normal");
  doc.text("Bahía Blanca", col2 + 22, by);

  by += 5;
  doc.setFont("helvetica", "bold");
  doc.text("CP:", col1, by);
  doc.setFont("helvetica", "normal");
  doc.text("8000", col1 + 10, by);

  doc.setFont("helvetica", "bold");
  doc.text("Provincia:", col2, by);
  doc.setFont("helvetica", "normal");
  doc.text("Buenos Aires", col2 + 22, by);

  by += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Actividad:", col1, by);
  doc.setFont("helvetica", "normal");
  doc.text("Construcción", col1 + 22, by);

  y += 32;

  // Employee data box
  doc.rect(margin, y, boxW, 18);
  by = y + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Nombre y Apellido:", col1, by);
  doc.setFont("helvetica", "normal");
  doc.text(`${personal.nombre || ""} ${personal.apellido || ""}`.trim(), col1 + 38, by);

  doc.setFont("helvetica", "bold");
  doc.text("D.N.I.:", col2, by);
  doc.setFont("helvetica", "normal");
  doc.text(personal.dni || "-", col2 + 14, by);

  by += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Puesto de Trabajo:", col1, by);
  doc.setFont("helvetica", "normal");
  doc.text(ROL_LABELS[personal.rol] || personal.rol, col1 + 38, by);

  by += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Descripción del E.P.P. entregado:", col1, by);

  y += 22;

  // Description paragraph
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const descText =
    "Hago entrega de los Elementos de Protección Personal que se detallan a continuación, los cuales deberán ser utilizados obligatoriamente durante la jornada laboral, de acuerdo a la tarea asignada y conforme a lo establecido en la Ley 19.587 y su Decreto Reglamentario 351/79 y la Resolución SRT 299/11.";
  const splitDesc = doc.splitTextToSize(descText, boxW - 6);
  doc.text(splitDesc, col1, y);
  y += splitDesc.length * 3.5 + 3;

  // Items table
  const fechaFormatted = new Date(fecha + "T12:00:00").toLocaleDateString("es-AR");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      ["N°", "Producto", "Tipo / Modelo", "Marca", "Cert.", "Cant.", "Fecha Entrega", "Firma Trabajador"],
    ],
    body: items.map((item, i) => [
      (i + 1).toString(),
      item.producto,
      item.tipo_modelo || "",
      item.marca || "",
      item.posee_certificacion ? "SI" : "NO",
      item.cantidad.toString(),
      fechaFormatted,
      "", // Firma en blanco
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 7.5, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 22 },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 12, halign: "center" },
      6: { cellWidth: 24, halign: "center" },
      7: { cellWidth: 30 },
    },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Add empty rows for additional items
  const emptyRows = Math.max(0, 4 - items.length);
  if (emptyRows > 0 && y < 230) {
    // Already handled by the table
  }

  // Signature blocks at bottom
  const sigY = Math.max(y + 15, 240);

  if (sigY < doc.internal.pageSize.getHeight() - 30) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Employer signature
    doc.line(margin, sigY, margin + 60, sigY);
    doc.text("Firma y aclaración del Empleador", margin, sigY + 4);

    // Employee signature
    doc.line(pageW - margin - 60, sigY, pageW - margin, sigY);
    doc.text("Firma y aclaración del Trabajador", pageW - margin - 60, sigY + 4);
  }

  doc.save(`EPP_${personal.apellido || "empleado"}_${personal.nombre || ""}_${fecha}.pdf`);
}

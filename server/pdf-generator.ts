import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import type { InspectionWithItems } from "@shared/schema";

const LOGO_PATH = path.resolve(import.meta.dirname, "..", "attached_assets", "LOGO SEGOVIA FINAL_1755277040549.png");

function loadLogoBase64(): string | null {
  try {
    if (!fs.existsSync(LOGO_PATH)) return null;
    const buf = fs.readFileSync(LOGO_PATH);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function formatDateLong(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}

export interface VehicleInfo {
  name: string;
  licensePlate: string;
  type: string;
}

/**
 * Generate a PDF buffer for a completed inspection, mirroring the client-side report.
 * Returns a Buffer ready to be uploaded to Google Drive.
 */
export function generateInspectionPdf(inspection: InspectionWithItems, vehicle?: VehicleInfo): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  const CW = W - M * 2;

  const vName = vehicle?.name ?? "—";
  const vPlate = vehicle?.licensePlate ?? "—";
  const vType = vehicle?.type ?? "—";

  // ── Header ─────────────────────────────────────────────────────
  doc.setFillColor(22, 107, 52);
  doc.rect(0, 0, W, 44, "F");

  const logo = loadLogoBase64();
  if (logo) {
    try {
      const maxW = 38, maxH = 28;
      const imgProps = doc.getImageProperties(logo);
      const ratio = imgProps.width / imgProps.height;
      let lw = maxW, lh = maxW / ratio;
      if (lh > maxH) { lh = maxH; lw = maxH * ratio; }
      const lx = M;
      const ly = (44 - lh) / 2;
      doc.addImage(logo, "PNG", lx, ly, lw, lh);
    } catch { /* ignore logo errors */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15); doc.setFont("helvetica", "bold");
  doc.text("INFORME DE INSPECCIÓN VEHICULAR", W / 2, 18, { align: "center" });
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
  doc.text("Segovia Aseo S.A.E.S.P.  ·  Sistema de Gestión de Flota", W / 2, 26, { align: "center" });
  doc.setFontSize(8);
  doc.text(`Fecha del informe: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`, W / 2, 33, { align: "center" });

  // ── Info block ─────────────────────────────────────────────────
  let y = 48;
  const fields: [string, string][] = [
    ["VEHÍCULO", vName],
    ["PLACA", vPlate],
    ["TIPO", vType],
    ["FECHA INSPECCIÓN", formatDateLong(inspection.date)],
    ["INSPECTOR", inspection.inspector],
    ["CONDUCTOR / MECÁNICO", inspection.driverName ?? "—"],
    ["HORA INICIO", inspection.startTime ?? "—"],
    ["HORA FIN", inspection.endTime ?? "—"],
  ];

  const half = Math.ceil(fields.length / 2);
  const cols = [fields.slice(0, half), fields.slice(half)];

  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(210, 218, 230);
  doc.roundedRect(M, y, CW, 34, 2, 2, "FD");

  cols.forEach((col, ci) => {
    const cx = M + 4 + ci * (CW / 2);
    col.forEach(([label, value], ri) => {
      const ry = y + 6 + ri * 8;
      doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 120, 150);
      doc.text(label, cx, ry);
      doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
      doc.text(value, cx, ry + 4);
    });
  });

  // ── Summary boxes ──────────────────────────────────────────────
  y += 40;
  const pdfPass = inspection.items.filter(i => i.status === "pass").length;
  const pdfFail = inspection.items.filter(i => i.status === "fail").length;
  const pdfNc = inspection.items.filter(i => i.status === "not-checked").length;
  const pdfNa = inspection.items.filter(i => i.status === "n/a").length;
  const pdfApplicable = inspection.items.length - pdfNa;
  const pdfPct = pdfApplicable > 0 ? Math.round((pdfPass / pdfApplicable) * 100) : 100;

  const boxes = [
    { label: "APROBADOS", value: pdfPass, r: 39, g: 174, b: 96 },
    { label: "FALLIDOS", value: pdfFail, r: 231, g: 76, b: 60 },
    { label: "N/A", value: pdfNa, r: 100, g: 116, b: 139 },
    { label: "SIN REVISAR", value: pdfNc, r: 149, g: 165, b: 166 },
    { label: "CUMPLIMIENTO", value: `${pdfPct}%`, r: 22, g: 107, b: 52 },
  ];
  const bw = (CW - 16) / 5;
  boxes.forEach((b, i) => {
    const bx = M + i * (bw + 4);
    doc.setFillColor(b.r, b.g, b.b);
    doc.roundedRect(bx, y, bw, 18, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(String(b.value), bx + bw / 2, y + 11, { align: "center" });
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text(b.label, bx + bw / 2, y + 16, { align: "center" });
  });

  // ── Checklist ──────────────────────────────────────────────────
  y += 24;
  const sections = [
    { key: "technical", title: "TÉCNICO-MECÁNICO", r: 41, g: 128, b: 185 },
    { key: "safety", title: "SEGURIDAD Y BOTIQUÍN", r: 230, g: 126, b: 34 },
    { key: "legal", title: "DOCUMENTACIÓN LEGAL", r: 142, g: 68, b: 173 },
  ];

  for (const sec of sections) {
    const items = inspection.items
      .filter(i => i.category === sec.key)
      .sort((a, b) => parseInt(a.sortOrder ?? "0") - parseInt(b.sortOrder ?? "0"));
    if (!items.length) continue;
    if (y > H - 55) { doc.addPage(); y = 18; }
    doc.setFillColor(sec.r, sec.g, sec.b);
    doc.rect(M, y, CW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    const secPass = items.filter(i => i.status === "pass").length;
    doc.text(`${sec.title}  (${secPass}/${items.length} aprobados)`, M + 3, y + 5.5);
    y += 9;

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Ítem", "Estado", "Observaciones"]],
      body: items.map(item => [
        item.name,
        item.status === "pass" ? "✓ Aprobado" : item.status === "fail" ? "✗ Fallido" : item.status === "n/a" ? "◌ N/A" : "– Sin revisar",
        item.notes ?? "",
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: [240, 244, 250], textColor: [50, 70, 110], fontStyle: "bold", fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: CW * 0.50 },
        1: { cellWidth: CW * 0.22 },
        2: { cellWidth: CW * 0.28 },
      },
      didParseCell: (data: any) => {
        if (data.column.index === 1 && data.section === "body") {
          const v = data.cell.raw as string;
          if (v.startsWith("✓")) { data.cell.styles.textColor = [22, 130, 52]; data.cell.styles.fontStyle = "bold"; }
          else if (v.startsWith("✗")) { data.cell.styles.textColor = [190, 28, 28]; data.cell.styles.fontStyle = "bold"; }
          else if (v.startsWith("◌")) { data.cell.styles.textColor = [100, 116, 139]; data.cell.styles.fontStyle = "italic"; }
          else { data.cell.styles.textColor = [140, 140, 140]; }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Notes ──────────────────────────────────────────────────────
  if (inspection.notes) {
    if (y > H - 40) { doc.addPage(); y = 18; }
    doc.setFillColor(250, 249, 240); doc.setDrawColor(210, 200, 170);
    const noteLines = doc.splitTextToSize(inspection.notes, CW - 8);
    const noteH = Math.max(14, noteLines.length * 5 + 8);
    doc.roundedRect(M, y, CW, noteH, 2, 2, "FD");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 90, 50);
    doc.text("OBSERVACIONES GENERALES", M + 3, y + 5);
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 40);
    doc.text(noteLines, M + 3, y + 11);
    y += noteH + 6;
  }

  // ── Digital Signatures ─────────────────────────────────────────
  const hasSigs = !!(inspection.inspectorSignature || inspection.driverSignature);
  if (y > H - 68) { doc.addPage(); y = 18; }
  y += 4;
  doc.setFillColor(245, 247, 252); doc.setDrawColor(200, 210, 230);
  doc.roundedRect(M, y, CW, hasSigs ? 66 : 52, 2, 2, "FD");
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(50, 70, 120);
  doc.text("FIRMAS DE CONFORMIDAD", W / 2, y + 7, { align: "center" });

  const sw = (CW - 20) / 2;
  const s1x = M + 5; const s2x = M + CW / 2 + 5;

  if (hasSigs) {
    const sigY = y + 12;
    const sigH = 30;
    if (inspection.inspectorSignature) {
      try {
        const sigData = inspection.inspectorSignature.startsWith("data:")
          ? inspection.inspectorSignature
          : `data:image/png;base64,${inspection.inspectorSignature}`;
        doc.addImage(sigData, "PNG", s1x, sigY, sw, sigH);
      } catch { /* ignore */ }
    }
    if (inspection.driverSignature) {
      try {
        const sigData = inspection.driverSignature.startsWith("data:")
          ? inspection.driverSignature
          : `data:image/png;base64,${inspection.driverSignature}`;
        doc.addImage(sigData, "PNG", s2x, sigY, sw, sigH);
      } catch { /* ignore */ }
    }
    const lineY = y + 46;
    doc.setDrawColor(70, 90, 130); doc.setLineWidth(0.6);
    doc.line(s1x, lineY, s1x + sw, lineY);
    doc.line(s2x, lineY, s2x + sw, lineY);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text(inspection.inspector, s1x + sw / 2, lineY + 5, { align: "center" });
    doc.text(inspection.driverName ?? "________________________", s2x + sw / 2, lineY + 5, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text("INSPECTOR", s1x + sw / 2, lineY + 10, { align: "center" });
    doc.text("CONDUCTOR / MECÁNICO", s2x + sw / 2, lineY + 10, { align: "center" });
  } else {
    const lineY = y + 38;
    doc.setDrawColor(70, 90, 130); doc.setLineWidth(0.6);
    doc.line(s1x, lineY, s1x + sw, lineY);
    doc.line(s2x, lineY, s2x + sw, lineY);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text(inspection.inspector, s1x + sw / 2, lineY + 5, { align: "center" });
    doc.text(inspection.driverName ?? "________________________", s2x + sw / 2, lineY + 5, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text("INSPECTOR", s1x + sw / 2, lineY + 10, { align: "center" });
    doc.text("CONDUCTOR / MECÁNICO", s2x + sw / 2, lineY + 10, { align: "center" });
  }

  // ── Footer ─────────────────────────────────────────────────────
  const pages = (doc as any).internal.pages.length - 1;
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(22, 107, 52);
    doc.rect(0, H - 10, W, 10, "F");
    doc.setTextColor(180, 230, 200); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text("Segovia Aseo S.A.E.S.P.  ·  Sistema de Inspección Vehicular", W / 2, H - 5.5, { align: "center" });
    doc.text(`Página ${p} de ${pages}`, W - M, H - 5.5, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export function buildInspectionFileName(inspection: InspectionWithItems, vehicle?: VehicleInfo): string {
  const plate = (vehicle?.licensePlate ?? "vehiculo").replace(/[^a-zA-Z0-9]/g, "");
  return `Inspeccion_${plate}_${inspection.date}.pdf`;
}

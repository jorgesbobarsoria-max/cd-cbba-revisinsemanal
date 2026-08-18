// Render de la sección "Análisis de baterías (Fluke BTA 521)" para los
// informes Word de mantenimiento preventivo.

import {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, AlignmentType, ImageRun,
} from "docx";
import { barChartSvg, svgImageOptions } from "@/lib/chart-svg";
import type { BateriasImportadas } from "@/lib/bta521";

const border = { style: BorderStyle.SINGLE, size: 4, color: "B0BEC5" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function txt(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20, color: opts.color, font: "Calibri" })] });
}

function c(text: string, opts: { bold?: boolean; fill?: string; width?: number; color?: string; align?: any } = {}) {
  return new TableCell({
    borders: cellBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: opts.bold, size: 18, font: "Calibri", color: opts.color })] })],
  });
}

const fillEstado: Record<string, string> = { buena: "E8F5E9", regular: "FFF3E0", critica: "FFEBEE", sin_dato: "ECEFF1" };
const labelEstado: Record<string, string> = { buena: "Buena", regular: "Regular", critica: "Crítica", sin_dato: "—" };

const nf = (v: number | null, d = 2) => (v == null ? "—" : v.toFixed(d));

/** Devuelve true si el objeto guardado corresponde a una importación válida. */
export function esImportBaterias(v: any): v is BateriasImportadas {
  return !!v && Array.isArray(v.mediciones) && !!v.resumen;
}

export function renderAnalisisBaterias(data: BateriasImportadas): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const r = data.resumen;

  out.push(txt(`Análisis de baterías – medición de resistencia interna (${data.equipo})`, { bold: true, size: 22, color: "0D3B66" }));
  out.push(txt(`Fuente: ${data.archivo} (${data.formato === "excel" ? "planilla Excel" : "documento Word"}) · ${r.cantidad} celdas medidas`, { size: 18, color: "607D8B" }));

  out.push(new Table({
    width: { size: 10360, type: WidthType.DXA },
    columnWidths: [2072, 2072, 2072, 2072, 2072],
    rows: [
      new TableRow({ tableHeader: true, children: [
        c("Promedio (mΩ)", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 2072, align: AlignmentType.CENTER }),
        c("Mediana (mΩ)", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 2072, align: AlignmentType.CENTER }),
        c("Máximo (mΩ)", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 2072, align: AlignmentType.CENTER }),
        c("Desv. máx.", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 2072, align: AlignmentType.CENTER }),
        c("V promedio", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 2072, align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        c(nf(r.promedio), { width: 2072, align: AlignmentType.CENTER }),
        c(nf(r.referencia), { width: 2072, align: AlignmentType.CENTER }),
        c(nf(r.maximo), { width: 2072, align: AlignmentType.CENTER }),
        c(r.desviacionMax == null ? "—" : `${r.desviacionMax.toFixed(0)}%`, { width: 2072, align: AlignmentType.CENTER, bold: true }),
        c(nf(r.voltajePromedio), { width: 2072, align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        c(`Buenas: ${r.buenas}`, { width: 2072, align: AlignmentType.CENTER, fill: "E8F5E9" }),
        c(`Regulares: ${r.regulares}`, { width: 2072, align: AlignmentType.CENTER, fill: "FFF3E0" }),
        c(`Críticas: ${r.criticas}`, { width: 2072, align: AlignmentType.CENTER, fill: "FFEBEE" }),
        c(`V mínimo: ${nf(r.voltajeMin)}`, { width: 2072, align: AlignmentType.CENTER }),
        c(`Total: ${r.cantidad}`, { width: 2072, align: AlignmentType.CENTER }),
      ]}),
    ],
  }));

  // Detalle por celda
  const rows: TableRow[] = [
    new TableRow({ tableHeader: true, children: [
      c("Celda", { bold: true, fill: "455A64", color: "FFFFFF", width: 3160 }),
      c("Resistencia (mΩ)", { bold: true, fill: "455A64", color: "FFFFFF", width: 2400, align: AlignmentType.CENTER }),
      c("Voltaje (V)", { bold: true, fill: "455A64", color: "FFFFFF", width: 2000, align: AlignmentType.CENTER }),
      c("Temp. (°C)", { bold: true, fill: "455A64", color: "FFFFFF", width: 1400, align: AlignmentType.CENTER }),
      c("Estado", { bold: true, fill: "455A64", color: "FFFFFF", width: 1400, align: AlignmentType.CENTER }),
    ]}),
  ];
  for (const m of data.mediciones) {
    rows.push(new TableRow({ children: [
      c(m.etiqueta, { width: 3160 }),
      c(nf(m.resistencia), { width: 2400, align: AlignmentType.CENTER }),
      c(nf(m.voltaje), { width: 2000, align: AlignmentType.CENTER }),
      c(nf(m.temperatura, 1), { width: 1400, align: AlignmentType.CENTER }),
      c(labelEstado[m.estado], { width: 1400, align: AlignmentType.CENTER, bold: true, fill: fillEstado[m.estado] }),
    ]}));
  }
  out.push(new Table({ width: { size: 10360, type: WidthType.DXA }, columnWidths: [3160, 2400, 2000, 1400, 1400], rows }));

  // Gráfica de resistencia por celda
  const conRes = data.mediciones.filter((m) => m.resistencia != null);
  if (conRes.length >= 2) {
    const svg = barChartSvg({
      titulo: "Resistencia interna por celda (mΩ)",
      labels: conRes.map((m) => m.etiqueta.slice(0, 8)),
      series: [{ label: "Resistencia (mΩ)", data: conRes.map((m) => m.resistencia), color: "#1f77b4" }],
      unidad: "mΩ",
    });
    out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 }, children: [
      new ImageRun(svgImageOptions(svg, 560, 265, "Resistencia interna por celda")),
    ]}));
  }

  out.push(txt(r.diagnostico, { size: 20 }));
  return out;
}

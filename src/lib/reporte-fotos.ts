import { Paragraph, TextRun, ImageRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";

const b = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: b, bottom: b, left: b, right: b };

export type FotoBin = { bytes: Uint8Array; caption?: string | null };

/** Descarga la foto vía URL firmada y devuelve bytes. */
export async function fetchFotoBytes(
  supabase: any,
  storagePath: string,
): Promise<Uint8Array | null> {
  try {
    const { data } = await supabase.storage.from("evidencias").createSignedUrl(storagePath, 300);
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
}

/** Renderiza una fila compacta con hasta 3 imágenes en línea + caption pequeño. */
export function renderFotosRow(fotos: FotoBin[], titulo?: string): (Paragraph | Table)[] {
  if (!fotos.length) return [];
  const out: (Paragraph | Table)[] = [];
  if (titulo) {
    out.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: titulo, bold: true, size: 18, color: "455A64", font: "Calibri" })],
    }));
  }
  const cells = fotos.slice(0, 3).map((f) => new TableCell({
    borders: noBorders,
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
    width: { size: 3400, type: WidthType.DXA },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new ImageRun({ type: "jpg", data: f.bytes, transformation: { width: 210, height: 160 }, altText: { title: "Evidencia", description: f.caption ?? "evidencia", name: "evidencia" } }),
      ]}),
      ...(f.caption ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: f.caption, size: 14, italics: true, color: "78909C", font: "Calibri" })] })] : []),
    ],
  }));
  while (cells.length < 3) cells.push(new TableCell({ borders: noBorders, width: { size: 3400, type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }));
  out.push(new Table({
    width: { size: 10200, type: WidthType.DXA },
    columnWidths: [3400, 3400, 3400],
    rows: [new TableRow({ children: cells })],
  }));
  return out;
}

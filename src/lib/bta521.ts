// Importación y análisis de planillas de resistencia interna de baterías
// generadas por el equipo Fluke BTA 521 (formato Excel .xlsx o Word .docx).
// El parseo es puro (sin dependencias nativas) para poder ejecutarse tanto en
// el navegador como en el runtime del servidor.

import { unzipSync, strFromU8 } from "fflate";

export type BateriaMedicion = {
  n: number;
  etiqueta: string;
  resistencia: number | null; // mΩ
  voltaje: number | null; // V
  temperatura: number | null; // °C
  estado: "buena" | "regular" | "critica" | "sin_dato";
};

export type BateriaResumen = {
  cantidad: number;
  promedio: number | null;
  minimo: number | null;
  maximo: number | null;
  referencia: number | null; // línea base usada (mediana)
  desviacionMax: number | null; // % sobre la referencia
  buenas: number;
  regulares: number;
  criticas: number;
  voltajePromedio: number | null;
  voltajeMin: number | null;
  diagnostico: string;
};

export type BateriasImportadas = {
  archivo: string;
  formato: "excel" | "word";
  equipo: string; // marca/modelo del instrumento
  importadoEn: string;
  mediciones: BateriaMedicion[];
  resumen: BateriaResumen;
};

const INSTRUMENTO = "Fluke BTA 521";

function toNum(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw).replace(/\s/g, "").replace(/[^\d.,+-]/g, "");
  if (!s) return null;
  const norm = s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s.replace(/,/g, "");
  const v = parseFloat(norm);
  return Number.isFinite(v) ? v : null;
}

function median(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---------- lectura de tablas ----------

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function xlsxRows(buf: Uint8Array): string[][] {
  const files = unzipSync(buf);
  const sharedXml = files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : "";
  const shared: string[] = [];
  for (const si of sharedXml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    shared.push(
      (si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? [])
        .map((t) => t.replace(/<[^>]+>/g, ""))
        .join("")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">"),
    );
  }
  const sheetName = Object.keys(files).find((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f));
  if (!sheetName) return [];
  const xml = strFromU8(files[sheetName]);
  const rows: string[][] = [];
  for (const rowXml of xml.match(/<row[\s\S]*?<\/row>/g) ?? []) {
    const cells: string[] = [];
    for (const c of rowXml.match(/<c[\s\S]*?(?:\/>|<\/c>)/g) ?? []) {
      const ref = /r="([A-Z]+\d+)"/.exec(c)?.[1];
      const type = /t="([^"]+)"/.exec(c)?.[1];
      const raw = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(c)?.[1] ?? "";
      let val = raw.replace(/<[^>]+>/g, "");
      if (type === "s") val = shared[parseInt(val, 10)] ?? "";
      const idx = ref ? colIndex(ref) : cells.length;
      while (cells.length < idx) cells.push("");
      cells[idx] = val.trim();
    }
    rows.push(cells);
  }
  return rows;
}

function docxRows(buf: Uint8Array): string[][] {
  const files = unzipSync(buf);
  const doc = files["word/document.xml"];
  if (!doc) return [];
  const xml = strFromU8(doc);
  const rows: string[][] = [];
  for (const tr of xml.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) ?? []) {
    const cells = (tr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) ?? []).map((tc) =>
      (tc.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [])
        .map((t) => t.replace(/<[^>]+>/g, ""))
        .join("")
        .replace(/&amp;/g, "&")
        .trim(),
    );
    rows.push(cells);
  }
  if (rows.length) return rows;
  // Sin tablas: intentar líneas de texto separadas por espacios
  const paras = (xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? []).map((wp) =>
    (wp.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join(""),
  );
  return paras.map((line) => line.trim().split(/\s{2,}|\t/).filter(Boolean));
}

// ---------- detección de columnas ----------

type Cols = { id: number; res: number; volt: number; temp: number };

function detectarColumnas(rows: string[][]): { header: number; cols: Cols } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const r = rows[i].map((c) => c.toLowerCase());
    const find = (re: RegExp) => r.findIndex((c) => re.test(c));
    const res = find(/resist|ohm|mω|mohm|impedanc/);
    if (res < 0) continue;
    const volt = find(/volt|tensi[oó]n|\bv\b|vdc/);
    const temp = find(/temp|°c/);
    let id = find(/cell|celda|bater|n[°ºo]|id|unit|blo/);
    if (id < 0) id = 0;
    return { header: i, cols: { id, res, volt, temp } };
  }
  return null;
}

function clasificar(res: number | null, ref: number | null): BateriaMedicion["estado"] {
  if (res == null || ref == null || ref <= 0) return res == null ? "sin_dato" : "buena";
  const dev = ((res - ref) / ref) * 100;
  if (dev > 50) return "critica";
  if (dev > 20) return "regular";
  return "buena";
}

/** Analiza el contenido binario de un archivo .xlsx o .docx del Fluke BTA 521. */
export function parseBTA521(bytes: Uint8Array, filename: string): BateriasImportadas {
  const lower = filename.toLowerCase();
  const esExcel = lower.endsWith(".xlsx") || lower.endsWith(".xlsm");
  const esWord = lower.endsWith(".docx");
  if (!esExcel && !esWord) {
    throw new Error("Formato no soportado. Usa un archivo .xlsx (Excel) o .docx (Word) exportado por el BTA 521.");
  }

  let rows: string[][];
  try {
    rows = esExcel ? xlsxRows(bytes) : docxRows(bytes);
  } catch {
    throw new Error("No se pudo leer el archivo. Verifica que no esté dañado ni protegido con contraseña.");
  }

  const det = detectarColumnas(rows);
  if (!det) throw new Error("No se encontró una columna de resistencia interna (mΩ) en el archivo.");

  const mediciones: BateriaMedicion[] = [];
  for (let i = det.header + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.length) continue;
    const res = toNum(r[det.cols.res]);
    const volt = det.cols.volt >= 0 ? toNum(r[det.cols.volt]) : null;
    if (res == null && volt == null) continue;
    const etiquetaRaw = (r[det.cols.id] ?? "").trim();
    mediciones.push({
      n: mediciones.length + 1,
      etiqueta: etiquetaRaw || `Batería ${mediciones.length + 1}`,
      resistencia: res,
      voltaje: volt,
      temperatura: det.cols.temp >= 0 ? toNum(r[det.cols.temp]) : null,
      estado: "sin_dato",
    });
  }

  if (!mediciones.length) throw new Error("El archivo no contiene filas de medición legibles.");

  const resVals = mediciones.map((m) => m.resistencia).filter((v): v is number => v != null);
  const voltVals = mediciones.map((m) => m.voltaje).filter((v): v is number => v != null);
  const ref = median(resVals);
  for (const m of mediciones) m.estado = clasificar(m.resistencia, ref);

  const buenas = mediciones.filter((m) => m.estado === "buena").length;
  const regulares = mediciones.filter((m) => m.estado === "regular").length;
  const criticas = mediciones.filter((m) => m.estado === "critica").length;
  const maximo = resVals.length ? Math.max(...resVals) : null;
  const desviacionMax = maximo != null && ref ? ((maximo - ref) / ref) * 100 : null;

  const diagnostico = criticas
    ? `Se detectaron ${criticas} celda(s) con resistencia interna superior al 50% respecto a la mediana del banco; se recomienda su reemplazo inmediato y reevaluación de la autonomía.`
    : regulares
      ? `Se detectaron ${regulares} celda(s) con degradación incipiente (20–50% sobre la mediana); mantener en observación y reevaluar en la próxima intervención.`
      : "El banco de baterías presenta una resistencia interna homogénea, sin celdas fuera del rango de dispersión aceptable.";

  return {
    archivo: filename,
    formato: esExcel ? "excel" : "word",
    equipo: INSTRUMENTO,
    importadoEn: new Date().toISOString(),
    mediciones,
    resumen: {
      cantidad: mediciones.length,
      promedio: resVals.length ? resVals.reduce((a, b) => a + b, 0) / resVals.length : null,
      minimo: resVals.length ? Math.min(...resVals) : null,
      maximo,
      referencia: ref,
      desviacionMax,
      buenas,
      regulares,
      criticas,
      voltajePromedio: voltVals.length ? voltVals.reduce((a, b) => a + b, 0) / voltVals.length : null,
      voltajeMin: voltVals.length ? Math.min(...voltVals) : null,
      diagnostico,
    },
  };
}

export const BTA521_KEY = "bta521";

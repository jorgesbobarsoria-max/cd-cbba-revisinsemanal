// Generación de gráficas dentro del propio sistema (SVG), sin servicios externos.
// Se embeben en los documentos Word como imagen vectorial con respaldo PNG.

export type SerieGrafica = {
  label: string;
  data: (number | null)[];
  color?: string;
};

export type ConfigGrafica = {
  titulo?: string;
  labels: string[];
  series: SerieGrafica[];
  width?: number;
  height?: number;
};

export const COLORES_SERIE = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function nice(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

/** Gráfica de líneas con ejes, rejilla y leyenda, generada como SVG. */
export function lineChartSvg(cfg: ConfigGrafica): string {
  const W = cfg.width ?? 720;
  const H = cfg.height ?? 340;
  const series = cfg.series.filter((s) => s.data.some((v) => v != null && Number.isFinite(v)));
  const labels = cfg.labels;

  const legendRows = Math.ceil(Math.max(series.length, 1) / 3);
  const padTop = cfg.titulo ? 44 : 20;
  const padBottom = 34 + legendRows * 18;
  const padLeft = 62;
  const padRight = 18;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const values = series.flatMap((s) => s.data.filter((v): v is number => v != null && Number.isFinite(v)));
  let min = values.length ? Math.min(...values) : 0;
  let max = values.length ? Math.max(...values) : 1;
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1;
    min -= d;
    max += d;
  } else {
    const pad = (max - min) * 0.1;
    min -= pad;
    max += pad;
  }

  const x = (i: number) =>
    padLeft + (labels.length > 1 ? (i * plotW) / (labels.length - 1) : plotW / 2);
  const y = (v: number) => padTop + plotH - ((v - min) / (max - min)) * plotH;

  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  if (cfg.titulo) {
    parts.push(
      `<text x="${W / 2}" y="26" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="17" font-weight="bold" fill="#0D3B66">${esc(cfg.titulo)}</text>`,
    );
  }

  // Rejilla horizontal y etiquetas del eje Y
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = min + ((max - min) * i) / steps;
    const yy = y(v);
    parts.push(
      `<line x1="${padLeft}" y1="${yy}" x2="${padLeft + plotW}" y2="${yy}" stroke="#DDE3EA" stroke-width="1"/>`,
    );
    parts.push(
      `<text x="${padLeft - 8}" y="${yy + 4}" text-anchor="end" font-family="Calibri, Arial, sans-serif" font-size="12" fill="#607D8B">${esc(nice(v))}</text>`,
    );
  }

  // Ejes
  parts.push(
    `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" stroke="#90A4AE" stroke-width="1.5"/>`,
  );
  parts.push(
    `<line x1="${padLeft}" y1="${padTop + plotH}" x2="${padLeft + plotW}" y2="${padTop + plotH}" stroke="#90A4AE" stroke-width="1.5"/>`,
  );

  // Etiquetas del eje X
  labels.forEach((l, i) => {
    parts.push(
      `<text x="${x(i)}" y="${padTop + plotH + 18}" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="12" fill="#607D8B">${esc(l)}</text>`,
    );
  });

  // Series
  series.forEach((s, si) => {
    const color = s.color ?? COLORES_SERIE[si % COLORES_SERIE.length];
    let d = "";
    let pen = false;
    s.data.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) return;
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    if (d) parts.push(`<path d="${d.trim()}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`);
    s.data.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) return;
      parts.push(`<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.2" fill="${color}"/>`);
    });
  });

  // Leyenda
  series.forEach((s, si) => {
    const color = s.color ?? COLORES_SERIE[si % COLORES_SERIE.length];
    const col = si % 3;
    const row = Math.floor(si / 3);
    const lx = padLeft + col * (plotW / 3);
    const ly = padTop + plotH + 36 + row * 18;
    parts.push(`<rect x="${lx}" y="${ly - 9}" width="11" height="11" rx="2" fill="${color}"/>`);
    parts.push(
      `<text x="${lx + 16}" y="${ly}" font-family="Calibri, Arial, sans-serif" font-size="12" fill="#37474F">${esc(s.label.slice(0, 28))}</text>`,
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

/** Gráfica de barras verticales (una sola serie). */
export function barChartSvg(cfg: ConfigGrafica & { unidad?: string }): string {
  const W = cfg.width ?? 720;
  const H = cfg.height ?? 320;
  const labels = cfg.labels;
  const serie = cfg.series[0];
  const data = serie?.data ?? [];
  const padTop = cfg.titulo ? 44 : 20;
  const padBottom = 40;
  const padLeft = 62;
  const padRight = 18;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;
  const vals = data.filter((v): v is number => v != null && Number.isFinite(v));
  const max = vals.length ? Math.max(...vals) * 1.15 : 1;

  const parts: string[] = [`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`];
  if (cfg.titulo) {
    parts.push(
      `<text x="${W / 2}" y="26" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="17" font-weight="bold" fill="#0D3B66">${esc(cfg.titulo)}</text>`,
    );
  }
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    const yy = padTop + plotH - (v / max) * plotH;
    parts.push(`<line x1="${padLeft}" y1="${yy}" x2="${padLeft + plotW}" y2="${yy}" stroke="#DDE3EA"/>`);
    parts.push(
      `<text x="${padLeft - 8}" y="${yy + 4}" text-anchor="end" font-family="Calibri, Arial, sans-serif" font-size="12" fill="#607D8B">${esc(nice(v))}</text>`,
    );
  }
  const slot = plotW / Math.max(labels.length, 1);
  const bw = Math.min(slot * 0.6, 70);
  labels.forEach((l, i) => {
    const v = data[i];
    const cx = padLeft + slot * i + slot / 2;
    if (v != null && Number.isFinite(v)) {
      const bh = (v / max) * plotH;
      parts.push(
        `<rect x="${cx - bw / 2}" y="${padTop + plotH - bh}" width="${bw}" height="${bh}" rx="3" fill="${serie?.color ?? COLORES_SERIE[0]}"/>`,
      );
      parts.push(
        `<text x="${cx}" y="${padTop + plotH - bh - 6}" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="12" fill="#37474F">${esc(nice(v))}</text>`,
      );
    }
    parts.push(
      `<text x="${cx}" y="${padTop + plotH + 18}" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="12" fill="#607D8B">${esc(l.slice(0, 14))}</text>`,
    );
  });
  parts.push(
    `<line x1="${padLeft}" y1="${padTop + plotH}" x2="${padLeft + plotW}" y2="${padTop + plotH}" stroke="#90A4AE" stroke-width="1.5"/>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

/** PNG 1x1 transparente usado como respaldo obligatorio del SVG en docx. */
export const PNG_FALLBACK: Uint8Array = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

/** docx interpreta un string como data-URI; el SVG debe entregarse en bytes. */
export function svgBytes(svg: string): Uint8Array {
  return new TextEncoder().encode(svg);
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, PageOrientation, Header, Footer, PageNumber,
} from "docx";
import { getPlantilla, type ItemPlantilla } from "@/lib/mantenimiento-plantillas";
import { fetchFotoBytes, renderFotosRow, type FotoBin } from "@/lib/reporte-fotos";
import { endesycLogoBytes } from "@/lib/endesyc-logo";

const border = { style: BorderStyle.SINGLE, size: 4, color: "B0BEC5" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function p(text: string, opts: { bold?: boolean; size?: number; color?: string; align?: any } = {}) {
  return new Paragraph({
    alignment: opts.align,
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22, color: opts.color, font: "Calibri" })],
  });
}
function h(text: string, level: any) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, font: "Calibri", color: "0D3B66" })],
  });
}
function cell(text: string, opts: { bold?: boolean; fill?: string; width?: number; align?: any; color?: string } = {}) {
  return new TableCell({
    borders: cellBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: opts.bold, size: 20, font: "Calibri", color: opts.color })] })],
  });
}

async function fetchChartPng(config: object): Promise<Uint8Array | null> {
  try {
    const url = `https://quickchart.io/chart?w=720&h=320&bkg=white&c=${encodeURIComponent(JSON.stringify(config))}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
}

function fmtVal(v: any, it: ItemPlantilla): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) {
    const j = v.filter((x) => x !== "" && x != null).join(" / ");
    return j ? `${j}${it.u ? ` ${it.u}` : ""}` : "—";
  }
  return `${v}${it.u ? ` ${it.u}` : ""}`;
}

function num(v: any): number | null {
  if (v == null || v === "") return null;
  if (Array.isArray(v)) {
    const nums = v.map((x) => parseFloat(String(x).replace(",", "."))).filter((n) => !isNaN(n));
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function equipoLabel(row: any): string {
  if (row.equipo_externo) {
    const e = row.equipo_externo;
    return `${e.tag ?? e.modelo ?? "Equipo externo"}${e.marca ? ` · ${e.marca}` : ""}`;
  }
  return row.equipo_id ?? "—";
}
function equipoKey(row: any): string {
  return row.equipo_id ?? row.equipo_externo?.tag ?? row.equipo_externo?.modelo ?? "—";
}

export type PlantillaInforme =
  | "completo"       // Estructura estándar: portada + antecedentes + ficha + parámetros + tendencias + conclusiones
  | "ejecutivo"      // Resumen gerencial: portada + tabla resumen + hallazgos + conclusiones + recomendaciones
  | "tecnico"        // Enfoque técnico: ficha + parámetros + tendencias + hallazgos (sin antecedentes ni objeto)
  | "checklist"      // Formato lista de verificación por sección, sin gráficas
  | "por-tipo";      // Auto-selecciona el formato según el tipo de cada equipo

export const generarInformeMantenimientoWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ids: string[]; plantilla?: PlantillaInforme }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const ids = (data.ids ?? []).filter(Boolean);
    const plantillaInforme: PlantillaInforme = data.plantilla ?? "completo";
    if (!ids.length) throw new Error("Sin mantenimientos seleccionados");

    // Resuelve la plantilla efectiva para un tipo de equipo cuando el usuario elige "por-tipo"
    const resolverPlantillaPorTipo = (tipo: string): Exclude<PlantillaInforme, "por-tipo"> => {
      switch (tipo) {
        case "ups":
        case "ats":
        case "generador":
          return "tecnico";        // Énfasis eléctrico + tendencias
        case "climatizacion":
          return "completo";       // Requiere contexto térmico + histórico
        case "supresor":
          return "checklist";      // Verificación normativa
        case "mdc":
          return "ejecutivo";      // Vista consolidada
        default:
          return "completo";
      }
    };

    const { data: regs, error } = await supabase.from("mantenimientos")
      .select("*").in("id", ids).order("fecha", { ascending: true });
    if (error) throw new Error(error.message);
    const M = (regs ?? []) as any[];
    if (!M.length) throw new Error("No se encontraron registros");

    // Historial por (tipo + equipo) para tendencias
    const groupKeys = Array.from(new Set(M.map((r) => `${r.tipo}::${equipoKey(r)}`)));
    const histByGroup = new Map<string, any[]>();
    for (const gk of groupKeys) {
      const [tipo, key] = gk.split("::");
      const { data: hist } = await supabase.from("mantenimientos")
        .select("id,tipo,fecha,equipo_id,equipo_externo,datos")
        .eq("tipo", tipo).order("fecha", { ascending: true }).limit(12);
      const filtered = (hist ?? []).filter((r: any) => equipoKey(r) === key);
      histByGroup.set(gk, filtered);
    }

    // Evidencias fotográficas por mantenimiento
    const { data: evAll } = await supabase.from("evidencias").select("*").in("mantenimiento_id", ids);
    const EV = (evAll ?? []) as Array<{ id: string; mantenimiento_id: string; scope: string; equipo_ref: string | null; param_key: string | null; storage_path: string; caption: string | null }>;
    const fotoBytes = new Map<string, Uint8Array>();
    await Promise.all(EV.map(async (e) => {
      const b = await fetchFotoBytes(supabase, e.storage_path);
      if (b) fotoBytes.set(e.id, b);
    }));
    const binsForReg = (mid: string, pred: (e: typeof EV[number]) => boolean): FotoBin[] =>
      EV.filter((e) => e.mantenimiento_id === mid && pred(e))
        .map((e) => ({ bytes: fotoBytes.get(e.id)!, caption: e.caption }))
        .filter((x) => x.bytes);

    const children: (Paragraph | Table)[] = [];

    // Plantilla efectiva por registro (para "por-tipo")
    const effFor = (tipo: string): Exclude<PlantillaInforme, "por-tipo"> =>
      plantillaInforme === "por-tipo" ? resolverPlantillaPorTipo(tipo) : plantillaInforme;

    const anyCompleto = M.some((r) => effFor(r.tipo) === "completo");
    const showAntecedentes = plantillaInforme === "completo" || (plantillaInforme === "por-tipo" && anyCompleto);

    // Portada
    const tipos = Array.from(new Set(M.map((r) => r.tipo)));
    const subtitulos: Record<PlantillaInforme, string> = {
      completo: "Informe técnico completo",
      ejecutivo: "Resumen ejecutivo",
      tecnico: "Detalle técnico y tendencias",
      checklist: "Lista de verificación",
      "por-tipo": "Formato adaptativo por tipo de equipo",
    };
    const titulo = M.length === 1 ? "INFORME DE MANTENIMIENTO PREVENTIVO" : "INFORME CONSOLIDADO DE MANTENIMIENTO PREVENTIVO";
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 240 }, children: [new TextRun({ text: titulo, bold: true, size: 40, font: "Calibri", color: "0D3B66" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Infraestructura Crítica – Data Center", size: 26, font: "Calibri", color: "455A64" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: subtitulos[plantillaInforme], size: 22, italics: true, font: "Calibri", color: "607D8B" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: `${M.length} equipo(s) · ${tipos.length} tipo(s) de mantenimiento`, size: 24, bold: true, font: "Calibri" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: `Fecha del informe: ${new Date().toISOString().slice(0, 10)}`, size: 22, font: "Calibri" })] }),
      new Paragraph({ children: [new TextRun({ text: "", break: 6 })] }),
    );

    // 1. Antecedentes y 2. Objeto — solo formato completo
    if (showAntecedentes) {
      children.push(h("1. Antecedentes", HeadingLevel.HEADING_1));
      children.push(p("El presente informe consolida las actividades de mantenimiento preventivo ejecutadas sobre la infraestructura crítica del Data Center, conforme a los protocolos de inspección y a los formularios oficiales por tipo de equipo (Climatización, UPS, ATS, Grupo Generador, Sistema Supresor de Incendios y Micro Data Center)."));
      children.push(p("El mantenimiento preventivo tiene por finalidad anticipar fallas, prolongar la vida útil de los activos y garantizar la disponibilidad operativa de los sistemas de soporte que sustentan la continuidad del servicio de TI."));
      children.push(h("2. Objeto", HeadingLevel.HEADING_1));
      children.push(p(`Documentar el resultado de las intervenciones de mantenimiento preventivo realizadas sobre ${M.length} equipo(s), registrando los parámetros operativos relevantes, evaluando su comportamiento frente a los rangos nominales y emitiendo las recomendaciones técnicas derivadas de los hallazgos.`));
    }

    // Resumen tabla (siempre)
    children.push(h("Resumen de equipos intervenidos", HeadingLevel.HEADING_2));
    const resumenRows: TableRow[] = [
      new TableRow({ tableHeader: true, children: [
        cell("#", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 600, align: AlignmentType.CENTER }),
        cell("Tipo", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 2200 }),
        cell("Equipo", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 3000 }),
        cell("Fecha", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 1400, align: AlignmentType.CENTER }),
        cell("Técnico", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 1700 }),
        cell("Estado", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 1460, align: AlignmentType.CENTER }),
      ]}),
    ];
    M.forEach((r, i) => {
      const pl = getPlantilla(r.tipo);
      const fill = r.estado === "finalizado" ? "C8E6C9" : "FFE0B2";
      resumenRows.push(new TableRow({ children: [
        cell(String(i + 1), { width: 600, align: AlignmentType.CENTER }),
        cell(pl?.nombre ?? r.tipo, { width: 2200 }),
        cell(equipoLabel(r), { width: 3000 }),
        cell(r.fecha, { width: 1400, align: AlignmentType.CENTER }),
        cell(r.tecnico ?? "—", { width: 1700 }),
        cell((r.estado ?? "—").toUpperCase(), { fill, bold: true, width: 1460, align: AlignmentType.CENTER }),
      ]}));
    });
    children.push(new Table({ width: { size: 10360, type: WidthType.DXA }, columnWidths: [600, 2200, 3000, 1400, 1700, 1460], rows: resumenRows }));

    // 3. Desarrollo — omitido para formato ejecutivo
    const showDesarrollo = plantillaInforme !== "ejecutivo";
    if (showDesarrollo) {
      children.push(h(showAntecedentes ? "3. Desarrollo" : "Desarrollo por equipo", HeadingLevel.HEADING_1));
      children.push(p("A continuación se presenta el detalle individual de cada equipo. La profundidad de cada bloque se ajusta a la plantilla seleccionada."));
    }

    const todosHallazgos: { eq: string; tipo: string; hallazgo: string }[] = [];

    for (let idx = 0; idx < M.length; idx++) {
      const r = M[idx];
      const pl = getPlantilla(r.tipo);
      const datos: Record<string, any> = r.datos ?? {};
      const eff = effFor(r.tipo);
      const mostrarFichaCompleta = eff !== "ejecutivo";
      const mostrarParametros = eff === "completo" || eff === "tecnico" || eff === "checklist";
      const mostrarTendencias = eff === "completo" || eff === "tecnico";

      if (showDesarrollo) {
        children.push(h(`${showAntecedentes ? "3." : ""}${idx + 1} ${pl?.nombre ?? r.tipo} – ${equipoLabel(r)}`, HeadingLevel.HEADING_2));

        // Ficha
        const ext = r.equipo_externo ?? {};
        const fichaFull: [string, string][] = [
          ["Fecha", r.fecha ?? "—"],
          ["Técnico", r.tecnico ?? "—"],
          ["Cargo", r.cargo ?? "—"],
          ["Empresa / Proyecto", `${r.empresa ?? "—"} / ${r.proyecto ?? "—"}`],
          ["Ubicación", `${r.ciudad ?? "—"}${r.direccion ? " · " + r.direccion : ""}`],
          ["Actividad", r.actividad ?? "Preventivo"],
          ["Equipo", r.equipo_id ? `Registrado · ${r.equipo_id}` : `Externo · ${ext.tag ?? "—"}`],
          ["Marca / Modelo", `${ext.marca ?? "—"} ${ext.modelo ?? ""}`.trim()],
          ["Serie / Capacidad", `${ext.serie ?? "—"} · ${ext.capacidad ?? "—"}`],
        ];
        const fichaMini: [string, string][] = [
          ["Fecha", r.fecha ?? "—"],
          ["Técnico", r.tecnico ?? "—"],
          ["Equipo", r.equipo_id ?? ext.tag ?? "—"],
        ];
        const ficha = mostrarFichaCompleta ? fichaFull : fichaMini;
        const fichaRows = ficha.map(([k, v]) => new TableRow({ children: [
          cell(k, { bold: true, fill: "ECEFF1", width: 3000 }),
          cell(v, { width: 7360 }),
        ]}));
        children.push(new Table({ width: { size: 10360, type: WidthType.DXA }, columnWidths: [3000, 7360], rows: fichaRows }));

        // Parámetros por sección
        if (pl && mostrarParametros) {
          for (const sec of pl.secciones) {
            const rows: TableRow[] = [
              new TableRow({ tableHeader: true, children: [
                cell(sec.titulo, { bold: true, fill: "0D3B66", color: "FFFFFF", width: 6360 }),
                cell(eff === "checklist" ? "Verificación" : "Valor registrado", { bold: true, fill: "0D3B66", color: "FFFFFF", width: 4000, align: AlignmentType.CENTER }),
              ]}),
            ];
            let any = false;
            for (const it of sec.items) {
              const v = datos[it.k];
              const has = !(v == null || v === "" || (Array.isArray(v) && v.every((x) => !x)));
              if (has) any = true;
              // En modo checklist, resaltar OK/pendiente
              let display = fmtVal(v, it);
              let fillCell: string | undefined;
              if (eff === "checklist" && has) {
                const s = String(v);
                if (s === "Sí" || s === "OK" || s === "Cumple") fillCell = "E8F5E9";
                else if (/no|requiere|falla/i.test(s)) fillCell = "FFEBEE";
              }
              rows.push(new TableRow({ children: [
                cell(it.l, { width: 6360 }),
                cell(display, { width: 4000, align: AlignmentType.CENTER, bold: has, fill: fillCell }),
              ]}));
            }
            children.push(p(sec.titulo, { bold: true, size: 22, color: "0D3B66" }));
            children.push(new Table({ width: { size: 10360, type: WidthType.DXA }, columnWidths: [6360, 4000], rows }));
            if (!any) children.push(p("Sin registros en esta sección.", { size: 18, color: "90A4AE" }));
            // Fotos por parámetro (intercaladas dentro de la sección)
            for (const it of sec.items) {
              const bins = binsForReg(r.id, (e) => e.scope === "parametro" && e.param_key === it.k);
              if (bins.length) children.push(...renderFotosRow(bins, `Evidencia · ${it.l}`));
            }
          }
        }

        // Fotos generales del registro
        const genBins = binsForReg(r.id, (e) => e.scope === "general");
        if (genBins.length) children.push(...renderFotosRow(genBins, "Evidencia fotográfica general"));
      }

      // Tendencias (charts) — solo si la plantilla lo permite y en modo desarrollo
      const gk = `${r.tipo}::${equipoKey(r)}`;
      const hist = histByGroup.get(gk) ?? [];
      if (showDesarrollo && mostrarTendencias && pl && hist.length >= 2) {
        const numericItems: ItemPlantilla[] = [];
        for (const sec of pl.secciones) {
          for (const it of sec.items) {
            if (it.t === "numerico" || it.t === "trio") numericItems.push(it);
          }
        }
        const scored = numericItems.map((it) => ({
          it,
          count: hist.reduce((c, h) => c + (num(h.datos?.[it.k]) != null ? 1 : 0), 0),
        })).filter((x) => x.count >= 2).sort((a, b) => b.count - a.count).slice(0, 6);

        if (scored.length) {
          const labels = hist.map((h) => h.fecha?.slice(5) ?? "");
          const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];
          const datasets = scored.map((s, i) => ({
            label: `${s.it.l}${s.it.u ? ` (${s.it.u})` : ""}`.slice(0, 40),
            data: hist.map((h) => num(h.datos?.[s.it.k])),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length],
            fill: false, spanGaps: true, tension: 0.3,
          }));
          const png = await fetchChartPng({
            type: "line",
            data: { labels, datasets },
            options: {
              plugins: { title: { display: true, text: `Tendencia histórica · ${equipoLabel(r)}` }, legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
              scales: { y: { beginAtZero: false } },
            },
          });
          if (png) {
            children.push(p("Tendencia histórica (mantenimientos previos)", { bold: true, size: 20, color: "0D3B66" }));
            children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [
              new ImageRun({ type: "png", data: png, transformation: { width: 560, height: 250 }, altText: { title: "Tendencia", description: `Tendencia ${equipoLabel(r)}`, name: "tendencia" } }),
            ]}));
          }
        }
      } else if (showDesarrollo && mostrarTendencias && pl) {
        children.push(p("Sin histórico suficiente para gráfica de tendencia (se requieren ≥ 2 mantenimientos previos del mismo equipo).", { size: 18, color: "90A4AE" }));
      }

      // Hallazgos binarios negativos (siempre se recolectan, aunque el bloque no se muestre)
      if (pl) {
        for (const sec of pl.secciones) {
          for (const it of sec.items) {
            if (it.t === "binario") {
              const v = datos[it.k];
              const negativo = v === "No" || v === "Requiere cambio" || v === "Requiere limpieza" || v === "Requiere adición" || v === "Requiere reparación";
              if (negativo) {
                todosHallazgos.push({ eq: equipoLabel(r), tipo: pl.nombre, hallazgo: `${it.l}: ${v}` });
              }
            }
            if (it.t === "opcion") {
              const v = datos[it.k];
              if (typeof v === "string" && /requiere/i.test(v)) {
                todosHallazgos.push({ eq: equipoLabel(r), tipo: pl?.nombre ?? r.tipo, hallazgo: `${it.l}: ${v}` });
              }
            }
          }
        }
      }

      // Observaciones del equipo (omitir en checklist para mantener compacto)
      if (showDesarrollo && r.observaciones && eff !== "checklist") {
        children.push(p("Observaciones del técnico:", { bold: true, size: 22 }));
        children.push(p(r.observaciones, { size: 20 }));
      }
    }

    // Conclusiones y Recomendaciones — numeración dinámica
    const base = showAntecedentes ? 3 : (showDesarrollo ? 1 : 0);
    const nConcl = base + 1;
    const nReco = base + 2;
    children.push(h(`${nConcl}. Conclusiones`, HeadingLevel.HEADING_1));
    const concl: string[] = [];
    concl.push(`Se ejecutaron ${M.length} actividad(es) de mantenimiento preventivo sobre ${groupKeys.length} equipo(s) distintos, cubriendo ${tipos.length} tipo(s) de infraestructura crítica.`);
    if (todosHallazgos.length === 0) {
      concl.push("No se identificaron hallazgos críticos durante las inspecciones; todos los equipos auditados se encuentran operando dentro de las condiciones esperadas para su categoría.");
    } else {
      concl.push(`Se identificaron ${todosHallazgos.length} hallazgo(s) que requieren acción correctiva o seguimiento, detallados en la sección de recomendaciones.`);
    }
    const finalizados = M.filter((r) => r.estado === "finalizado").length;
    concl.push(`Del total intervenido, ${finalizados} registro(s) fueron finalizados y ${M.length - finalizados} permanecen como borrador a la fecha del presente informe.`);
    concl.push("Los parámetros eléctricos, térmicos y de control registrados quedan trazados en la plataforma para su análisis histórico y comparativo en futuras intervenciones.");
    for (const c of concl) children.push(p("• " + c));

    children.push(h(`${nReco}. Recomendaciones`, HeadingLevel.HEADING_1));
    if (todosHallazgos.length) {
      children.push(p("Hallazgos específicos:", { bold: true, size: 22 }));
      for (const f of todosHallazgos) {
        children.push(p(`• [${f.tipo}] ${f.eq} — ${f.hallazgo}`, { size: 20 }));
      }
    }
    const recos = [
      "Mantener el cronograma de mantenimiento preventivo según la periodicidad establecida por el fabricante de cada sistema.",
      "Conservar un stock mínimo de repuestos críticos (filtros, baterías, fusibles, refrigerante) para reducir el MTTR ante eventos no programados.",
      "Verificar trimestralmente la integridad de las conexiones eléctricas mediante termografía y reapriete de bornes.",
      "Documentar cada intervención correctiva derivada de los hallazgos del presente informe y vincularla al equipo correspondiente en la plataforma.",
      "Realizar pruebas funcionales periódicas de respaldo (UPS, generador, sistema supresor) en ventanas controladas para validar la autonomía y la cadena de transferencia.",
    ];
    for (const r of recos) children.push(p("• " + r));

    // Firmas
    children.push(new Paragraph({ children: [new TextRun({ text: "", break: 4 })] }));
    children.push(new Table({
      width: { size: 10360, type: WidthType.DXA },
      columnWidths: [5180, 5180],
      rows: [
        new TableRow({ children: [
          cell("\n\n_________________________\nTécnico responsable\nOperación – Infraestructura", { align: AlignmentType.CENTER, width: 5180 }),
          cell("\n\n_________________________\nSupervisor\nSupervisión de Operaciones", { align: AlignmentType.CENTER, width: 5180 }),
        ]}),
      ],
    }));

    const doc = new Document({
      creator: "Sistema de Mantenimiento Preventivo",
      title: "Informe de Mantenimiento Preventivo",
      styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1100, right: 1000, bottom: 1100, left: 1000 },
          },
        },
        headers: {
          default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
            new ImageRun({ type: "jpg", data: endesycLogoBytes(), transformation: { width: 90, height: 55 }, altText: { title: "ENDESYC", description: "Logotipo ENDESYC", name: "endesyc" } }),
            new TextRun({ text: "  Informe de Mantenimiento Preventivo", size: 18, color: "78909C", font: "Calibri" }),
          ] })] }),
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Página ", size: 18, color: "78909C", font: "Calibri" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "78909C", font: "Calibri" }),
            new TextRun({ text: " de ", size: 18, color: "78909C", font: "Calibri" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "78909C", font: "Calibri" }),
          ]})] }),
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const base64 = Buffer.from(buffer).toString("base64");
    const filename = M.length === 1
      ? `mantenimiento_${M[0].tipo}_${M[0].fecha}.docx`
      : `informe_mantenimiento_${new Date().toISOString().slice(0, 10)}.docx`;
    return { base64, filename };
  });

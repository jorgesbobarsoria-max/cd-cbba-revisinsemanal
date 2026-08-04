import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  ImageRun,
  PageOrientation,
  Header,
  Footer,
  PageNumber,
} from "docx";
import { fetchFotoBytes, renderFotosRow, type FotoBin } from "@/lib/reporte-fotos";
import { endesycLogoBytes } from "@/lib/endesyc-logo";
import { lineChartSvg, PNG_FALLBACK } from "@/lib/chart-svg";

type Equipo = { id: string; categoria: string; tag: string; marca: string | null; modelo: string | null; ubicacion: string | null; criticidad: string | null; orden: number };
type Punto = { id: number; equipo_id: string; numero: number; descripcion: string; tipo: string; unidad: string | null; min_ok: number | null; max_ok: number | null; min_alerta: number | null; max_alerta: number | null };
type Item = { punto_id: number; equipo_id: string; estado: string | null; valor: string | null; semaforo: string | null; observaciones: string | null; accion_correctiva: string | null };
type Insp = { id: string; fecha: string; semana: number; tecnico: string | null; turno: string | null; supervisor: string | null; cargo: string | null; condicion_clima: string | null; temp_sala: number | null; hr_sala: number | null; pue: number | null; carga_it: number | null; estado: string; standby_equipos: string[] | null };

const semaforoLabel: Record<string, string> = { verde: "OK", amarillo: "ALERTA", rojo: "FALLA", gris: "N/A" };
const semaforoFill: Record<string, string> = { verde: "C8E6C9", amarillo: "FFE0B2", rojo: "FFCDD2", gris: "ECEFF1" };

const border = { style: BorderStyle.SINGLE, size: 4, color: "B0BEC5" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function p(text: string, opts: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: opts.align,
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22, color: opts.color, font: "Calibri" })],
  });
}

function h(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, font: "Calibri", color: "0D3B66" })],
  });
}

function cell(text: string, opts: { bold?: boolean; fill?: string; width?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string } = {}) {
  return new TableCell({
    borders: cellBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: opts.bold, size: 20, font: "Calibri", color: opts.color })] })],
  });
}


export const generarInformeWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ inspeccionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { inspeccionId } = data;

    const { data: insp } = await supabase.from("inspecciones").select("*").eq("id", inspeccionId).single();
    if (!insp) throw new Error("Inspección no encontrada");

    const [{ data: equipos }, { data: puntos }, { data: items }, { data: historico }] = await Promise.all([
      supabase.from("equipos").select("*").order("orden"),
      supabase.from("puntos_inspeccion").select("*").order("numero"),
      supabase.from("inspeccion_items").select("*").eq("inspeccion_id", inspeccionId),
      supabase.from("inspecciones").select("id,fecha,semana").order("fecha", { ascending: false }).limit(8),
    ]);

    const I = insp as Insp;
    const E = (equipos ?? []) as Equipo[];
    const P = (puntos ?? []) as Punto[];
    const IT = (items ?? []) as Item[];
    const hist = (historico ?? []).slice().reverse(); // chronological
    const histIds = hist.map((x) => x.id);

    // load historical items for trend
    const { data: histItems } = histIds.length
      ? await supabase.from("inspeccion_items").select("inspeccion_id,punto_id,valor,semaforo").in("inspeccion_id", histIds)
      : { data: [] };
    const HI = (histItems ?? []) as Array<{ inspeccion_id: string; punto_id: number; valor: string | null; semaforo: string | null }>;

    // Evidencias fotográficas
    const { data: evRows } = await supabase.from("evidencias").select("*").eq("inspeccion_id", inspeccionId);
    const EV = (evRows ?? []) as Array<{ id: string; scope: string; equipo_ref: string | null; param_key: string | null; storage_path: string; caption: string | null }>;
    const fotoBytes = new Map<string, Uint8Array>();
    await Promise.all(EV.map(async (e) => {
      const b = await fetchFotoBytes(supabase, e.storage_path);
      if (b) fotoBytes.set(e.id, b);
    }));
    const binsFor = (pred: (e: typeof EV[number]) => boolean): FotoBin[] =>
      EV.filter(pred).map((e) => ({ bytes: fotoBytes.get(e.id)!, caption: e.caption })).filter((x) => x.bytes);

    // Resumen
    const ok = IT.filter((i) => i.semaforo === "verde").length;
    const al = IT.filter((i) => i.semaforo === "amarillo").length;
    const fa = IT.filter((i) => i.semaforo === "rojo").length;
    const na = IT.filter((i) => i.semaforo === "gris").length;
    const total = IT.length || 1;
    const disp = Math.round((ok / total) * 100);

    const children: (Paragraph | Table)[] = [];

    // Portada
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 240 }, children: [new TextRun({ text: "INFORME DE REVISIÓN SEMANAL", bold: true, size: 44, font: "Calibri", color: "0D3B66" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Infraestructura Crítica – Data Center", size: 28, font: "Calibri", color: "455A64" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [new TextRun({ text: `Semana ${I.semana} · ${I.fecha}`, size: 26, bold: true, font: "Calibri" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: `Técnico: ${I.tecnico ?? "—"}    Turno: ${I.turno ?? "—"}`, size: 22, font: "Calibri" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Supervisor: ${I.supervisor ?? "—"}`, size: 22, font: "Calibri" })] }),
      new Paragraph({ children: [new TextRun({ text: "", break: 8 })] }),
    );

    // 1. Antecedentes
    children.push(h("1. Antecedentes", HeadingLevel.HEADING_1));
    children.push(p("El presente informe consolida los resultados de la revisión semanal de la infraestructura crítica de soporte al Data Center, ejecutada conforme al plan de mantenimiento preventivo y al procedimiento de inspección visual y de parámetros operativos definido por el área de operaciones."));
    children.push(p("Las revisiones semanales tienen por finalidad garantizar la continuidad operativa de los sistemas eléctricos, mecánicos y de seguridad, identificando desviaciones tempranas que permitan implementar acciones correctivas antes de que se materialicen incidentes que afecten la disponibilidad del servicio."));

    // 2. Objeto
    children.push(h("2. Objeto", HeadingLevel.HEADING_1));
    children.push(p("Verificar el estado operativo de los equipos de aire de precisión, UPS, ATS, grupo electrógeno, sistema de supresión de incendios y sensores ambientales de la sala técnica, registrando los parámetros relevantes, evaluando su comportamiento frente a los rangos de operación definidos y documentando las acciones correctivas necesarias."));

    // Resumen ejecutivo (tabla)
    children.push(h("Resumen ejecutivo", HeadingLevel.HEADING_2));
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2340, 2340, 2340, 2340],
      rows: [
        new TableRow({ children: [
          cell("OK", { bold: true, fill: "C8E6C9", align: AlignmentType.CENTER, width: 2340 }),
          cell("Alerta", { bold: true, fill: "FFE0B2", align: AlignmentType.CENTER, width: 2340 }),
          cell("Falla", { bold: true, fill: "FFCDD2", align: AlignmentType.CENTER, width: 2340 }),
          cell("Disponibilidad", { bold: true, fill: "BBDEFB", align: AlignmentType.CENTER, width: 2340 }),
        ]}),
        new TableRow({ children: [
          cell(String(ok), { align: AlignmentType.CENTER, width: 2340 }),
          cell(String(al), { align: AlignmentType.CENTER, width: 2340 }),
          cell(String(fa), { align: AlignmentType.CENTER, width: 2340 }),
          cell(`${disp}%`, { bold: true, align: AlignmentType.CENTER, width: 2340 }),
        ]}),
      ],
    }));
    children.push(p(`Puntos evaluados: ${total} · N/A: ${na} · Condición de sala: T=${I.temp_sala ?? "—"}°C  HR=${I.hr_sala ?? "—"}%  PUE=${I.pue ?? "—"}`, { size: 20, color: "546E7A" }));

    // 3. Desarrollo
    children.push(h("3. Desarrollo", HeadingLevel.HEADING_1));
    children.push(p("A continuación se detalla el estado individual de cada equipo, los parámetros registrados durante la inspección y la tendencia histórica de las variables numéricas relevantes."));

    const standbySet = new Set((I.standby_equipos ?? []) as string[]);

    for (const eq of E) {
      const eqPuntos = P.filter((x) => x.equipo_id === eq.id);
      if (!eqPuntos.length) continue;
      const isStandby = standbySet.has(eq.id);
      const eqItems = IT.filter((i) => i.equipo_id === eq.id);
      const eqOk = eqItems.filter((i) => i.semaforo === "verde").length;
      const eqAl = eqItems.filter((i) => i.semaforo === "amarillo").length;
      const eqFa = eqItems.filter((i) => i.semaforo === "rojo").length;
      const estadoGeneral = isStandby ? "STAND BY" : eqFa > 0 ? "FALLA" : eqAl > 0 ? "ALERTA" : eqOk > 0 ? "OPERATIVO" : "SIN DATOS";
      const colorEstado = isStandby ? "6D4C41" : eqFa > 0 ? "C62828" : eqAl > 0 ? "EF6C00" : "2E7D32";

      children.push(h(`3.${E.indexOf(eq) + 1} ${eq.categoria} – ${eq.tag}`, HeadingLevel.HEADING_2));
      children.push(new Paragraph({ children: [
        new TextRun({ text: `Marca/Modelo: `, bold: true, size: 22, font: "Calibri" }),
        new TextRun({ text: `${eq.marca ?? "—"} ${eq.modelo ?? ""}`, size: 22, font: "Calibri" }),
        new TextRun({ text: `   |   Ubicación: `, bold: true, size: 22, font: "Calibri" }),
        new TextRun({ text: `${eq.ubicacion ?? "—"}`, size: 22, font: "Calibri" }),
        new TextRun({ text: `   |   Estado: `, bold: true, size: 22, font: "Calibri" }),
        new TextRun({ text: estadoGeneral, bold: true, size: 22, font: "Calibri", color: colorEstado }),
      ]}));

      if (isStandby) {
        children.push(new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [new TableRow({ children: [
            cell("Equipo en STAND BY — fuera de servicio en esta revisión. No se registraron parámetros operativos.", { fill: "FFF3E0", bold: true, align: AlignmentType.CENTER, color: "6D4C41", width: 9360 }),
          ]})],
        }));
        continue;
      }


      // tabla de parámetros
      const rows: TableRow[] = [
        new TableRow({ tableHeader: true, children: [
          cell("#", { bold: true, fill: "0D3B66", width: 600, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("Parámetro", { bold: true, fill: "0D3B66", width: 4200, color: "FFFFFF" }),
          cell("Valor", { bold: true, fill: "0D3B66", width: 1600, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("Rango OK", { bold: true, fill: "0D3B66", width: 1560, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("Estado", { bold: true, fill: "0D3B66", width: 1400, color: "FFFFFF", align: AlignmentType.CENTER }),
        ]}),

      ];
      for (const pt of eqPuntos) {
        const it = eqItems.find((x) => x.punto_id === pt.id);
        const sem = it?.semaforo ?? "gris";
        const rango = pt.tipo === "numerico" && pt.min_ok != null && pt.max_ok != null ? `${pt.min_ok} – ${pt.max_ok} ${pt.unidad ?? ""}` : pt.tipo === "binario" ? "No (sin alertas)" : "—";
        rows.push(new TableRow({ children: [
          cell(String(pt.numero), { align: AlignmentType.CENTER, width: 600 }),
          cell(pt.descripcion + (pt.unidad ? ` (${pt.unidad})` : ""), { width: 4200 }),
          cell(it?.valor ?? "—", { width: 1600, align: AlignmentType.CENTER }),
          cell(rango, { width: 1560, align: AlignmentType.CENTER }),
          cell(semaforoLabel[sem] ?? "N/A", { fill: semaforoFill[sem], align: AlignmentType.CENTER, bold: true, width: 1400 }),
        ]}));
      }
      children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [600, 4200, 1600, 1560, 1400], rows }));

      // Fotos generales del equipo
      const eqFotos = binsFor((e) => e.scope === "equipo" && e.equipo_ref === eq.id);
      if (eqFotos.length) children.push(...renderFotosRow(eqFotos, `Evidencia fotográfica – ${eq.tag}`));

      // Fotos por parámetro (intercaladas)
      for (const pt of eqPuntos) {
        const bins = binsFor((e) => e.scope === "parametro" && e.param_key === String(pt.id));
        if (bins.length) children.push(...renderFotosRow(bins, `Punto ${pt.numero}. ${pt.descripcion}`));
      }

      // observaciones
      const obs = eqItems.filter((i) => i.observaciones && i.observaciones.trim());
      if (obs.length) {
        children.push(p("Observaciones:", { bold: true, size: 22 }));
        for (const o of obs) {
          const pt = eqPuntos.find((x) => x.id === o.punto_id);
          children.push(p(`• [${pt?.numero ?? "—"}] ${o.observaciones}`, { size: 20 }));
        }
      }

      // tendencia (chart) — variables numéricas
      const numericPts = eqPuntos.filter((x) => x.tipo === "numerico");
      if (numericPts.length && hist.length > 1) {
        const labels = hist.map((h) => `S${h.semana}`);
        const datasets = numericPts.slice(0, 6).map((pt, idx) => {
          const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];
          return {
            label: pt.descripcion.slice(0, 26),
            data: hist.map((h) => {
              const hit = HI.find((x) => x.inspeccion_id === h.id && x.punto_id === pt.id);
              const v = hit?.valor ? parseFloat(hit.valor.replace(",", ".")) : null;
              return v != null && !isNaN(v) ? v : null;
            }),
            borderColor: colors[idx % colors.length],
            backgroundColor: colors[idx % colors.length],
            fill: false,
            spanGaps: true,
            tension: 0.3,
          };
        });
        const hasData = datasets.some((d) => d.data.some((v) => v != null));
        if (hasData) {
          const svg = lineChartSvg({
            titulo: `Tendencia – ${eq.tag}`,
            labels,
            series: datasets.map((d) => ({ label: d.label, data: d.data, color: d.borderColor })),
          });
          children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 }, children: [
            new ImageRun({ type: "svg", data: svg, fallback: { type: "png", data: PNG_FALLBACK }, transformation: { width: 560, height: 265 }, altText: { title: "Tendencia", description: `Tendencia de ${eq.tag}`, name: "tendencia" } }),
          ]}));
        }
      }
    }

    // Fotos generales de la revisión
    const genFotos = binsFor((e) => e.scope === "general");
    if (genFotos.length) {
      children.push(h("Evidencia fotográfica general", HeadingLevel.HEADING_2));
      children.push(...renderFotosRow(genFotos));
    }


    // 4. Conclusiones
    children.push(h("4. Conclusiones", HeadingLevel.HEADING_1));
    const conclusiones: string[] = [];
    conclusiones.push(`La revisión correspondiente a la semana ${I.semana} (${I.fecha}) evaluó ${total} puntos de inspección distribuidos en ${E.length} equipos críticos, alcanzando un indicador de disponibilidad operativa del ${disp}%.`);
    if (fa > 0) conclusiones.push(`Se identificaron ${fa} parámetro(s) en condición de FALLA que requieren intervención correctiva inmediata para preservar la continuidad del servicio.`);
    if (al > 0) conclusiones.push(`Se registraron ${al} parámetro(s) en condición de ALERTA que deberán ser monitoreados de cerca y atendidos durante la próxima ventana de mantenimiento.`);
    if (fa === 0 && al === 0) conclusiones.push("Todos los equipos auditados se encuentran operando dentro de los rangos nominales establecidos, sin desviaciones que comprometan la operación.");
    if (I.temp_sala != null) conclusiones.push(`Las condiciones ambientales de sala (T=${I.temp_sala}°C, HR=${I.hr_sala ?? "—"}%) se encuentran dentro del envolvente recomendado ASHRAE para data centers clase A1.`);
    for (const c of conclusiones) children.push(p("• " + c));

    // 5. Recomendaciones
    children.push(h("5. Recomendaciones", HeadingLevel.HEADING_1));
    const recos: string[] = [];
    const fallas = IT.filter((i) => i.semaforo === "rojo");
    const alertas = IT.filter((i) => i.semaforo === "amarillo");
    for (const f of fallas) {
      const pt = P.find((x) => x.id === f.punto_id);
      const eq = E.find((x) => x.id === f.equipo_id);
      recos.push(`Acción CORRECTIVA inmediata en ${eq?.tag ?? "—"} – ${pt?.descripcion ?? "—"}${f.accion_correctiva ? `: ${f.accion_correctiva}` : "."}`);
    }
    for (const a of alertas) {
      const pt = P.find((x) => x.id === a.punto_id);
      const eq = E.find((x) => x.id === a.equipo_id);
      recos.push(`Monitoreo PREVENTIVO en ${eq?.tag ?? "—"} – ${pt?.descripcion ?? "—"}. Reevaluar en la próxima revisión.`);
    }
    recos.push("Mantener el plan de revisión semanal y registrar todas las lecturas en la plataforma para conservar la trazabilidad histórica.");
    recos.push("Verificar el cumplimiento del cronograma de mantenimiento preventivo trimestral por parte del proveedor especializado de cada sistema.");
    recos.push("Conservar inventario mínimo de repuestos críticos (filtros de aire de precisión, baterías de UPS, fusibles de ATS) para reducir el MTTR ante eventos no programados.");
    for (const r of recos) children.push(p("• " + r));

    // firma
    children.push(new Paragraph({ children: [new TextRun({ text: "", break: 4 })] }));
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        new TableRow({ children: [
          cell(`\n\n_________________________\n${I.tecnico ?? "Técnico responsable"}\n${I.cargo ?? "Operación – Infraestructura"}`, { align: AlignmentType.CENTER, width: 4680 }),
          cell(`\n\n_________________________\n${I.supervisor ?? "Supervisor"}\nSupervisión de Operaciones`, { align: AlignmentType.CENTER, width: 4680 }),
        ]}),
      ],
    }));

    const doc = new Document({
      creator: "Sistema de Revisión Semanal",
      title: `Informe Semana ${I.semana}`,
      styles: {
        default: { document: { run: { font: "Calibri", size: 22 } } },
      },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 },
          },
        },
        headers: {
          default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
            new ImageRun({ type: "jpg", data: endesycLogoBytes(), transformation: { width: 90, height: 55 }, altText: { title: "ENDESYC", description: "Logotipo ENDESYC", name: "endesyc" } }),
            new TextRun({ text: `  Informe Semanal · S${I.semana} · ${I.fecha}`, size: 18, color: "78909C", font: "Calibri" }),
          ] })] }),
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Página ", size: 18, color: "78909C", font: "Calibri" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "78909C", font: "Calibri" }),
            new TextRun({ text: " de ", size: 18, color: "78909C", font: "Calibri" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "78909C", font: "Calibri" }),
          ]})]}),
        },
        children,
      }],
    });

    const buf = await Packer.toBase64String(doc);
    return { filename: `Informe_Semana_${I.semana}_${I.fecha}.docx`, base64: buf };
  });

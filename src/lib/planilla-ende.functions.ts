import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, ImageRun, PageOrientation, VerticalAlign,
} from "docx";
import { endesycLogoBytes } from "@/lib/endesyc-logo";

// Planilla "Revisión estado en equipos de infraestructura – Data Center Principal ENDE Matriz"
// replicada en Word y llenada con los datos de la revisión semanal.

const b = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const borders = { top: b, bottom: b, left: b, right: b };
const W = 14400; // ancho útil A4 horizontal aprox. (DXA)

function cell(text: string, width: number, opts: { bold?: boolean; fill?: string; span?: number; size?: number; align?: "center" | "left" } = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    columnSpan: opts.span,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    children: text.split("\n").map((line) => new Paragraph({
      alignment: opts.align === "left" ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: [new TextRun({ text: line, bold: opts.bold, size: opts.size ?? 16, font: "Arial" })],
    })),
  });
}

type Grupo = { titulo: string; equipos: string[]; filas: { label: string; numero: number }[][] };

// Disposición de columnas según la planilla original.
const GRUPOS: Grupo[] = [
  {
    titulo: "Aires de Precisión",
    equipos: ["EM-AIR-01", "EM-AIR-02"],
    filas: [
      [
        { label: "Temp. Retorno (°C)", numero: 1 }, { label: "Temp. de Inyección (°C)", numero: 2 },
        { label: "Humedad HR %", numero: 3 }, { label: "Ventilador Eva.", numero: 4 },
        { label: "Ventilador Cond.", numero: 5 }, { label: "Tensión Total del Sistema", numero: 6 },
        { label: "Corriente Totales del Sistema", numero: 7 }, { label: "Alertas", numero: 8 },
      ],
      [
        { label: "Fugas de Refrigerante Alta", numero: 9 }, { label: "Fugas de Refrigerante Baja", numero: 10 },
        { label: "Presión de ALTA (PSI)", numero: 11 }, { label: "Presión de Baja (PSI)", numero: 12 },
        { label: "Ruidos Anormales", numero: 13 }, { label: "Tensión del compresor", numero: 14 },
        { label: "Corrientes del compresor", numero: 15 },
      ],
    ],
  },
  {
    titulo: "UPS Data Center",
    equipos: ["EM-UPS-01"],
    filas: [[
      { label: "% de Carga", numero: 1 }, { label: "Tensión Entrada\nL1, L2, L3", numero: 2 },
      { label: "Voltaje de Baterías\n(VDC)", numero: 3 }, { label: "Frecuencia\n(Hz)", numero: 4 },
      { label: "Tiempo Autonomía", numero: 5 }, { label: "Tensión Salida (V)\nL1 L2 L3", numero: 6 },
      { label: "Corriente de Salida (A)\nL1 L2 L3", numero: 7 }, { label: "Alertas", numero: 8 },
    ]],
  },
  {
    titulo: "Grupo Electrógeno",
    equipos: ["EM-GEN-01"],
    filas: [[
      { label: "Revisión de Fugas", numero: 1 }, { label: "Batería (Volt.)", numero: 2 },
      { label: "Horas Func. (Hr.)", numero: 3 }, { label: "Nivel Combustible (%)", numero: 4 },
      { label: "Temp. Calentador Agua", numero: 5 }, { label: "Tensión Entrada/Salida\nL1, L2, L3", numero: 6 },
      { label: "Corriente de Salida\nL1 L2 L3", numero: 7 }, { label: "Alertas", numero: 8 },
    ]],
  },
  {
    titulo: "Seguridad",
    equipos: ["EM-SEG-01"],
    filas: [[
      { label: "Temperatura Ambiente\nT-1 / T-2", numero: 1 }, { label: "Humedad Relativa", numero: 2 },
      { label: "Sensor de Humo", numero: 3 }, { label: "Sensor de Puerta", numero: 4 },
      { label: "Sensor de Movimiento", numero: 5 }, { label: "Tensión\nL1, L2, L3", numero: 6 },
      { label: "BAT\nVDC", numero: 7 }, { label: "Salida de Mensajes SMS Teléfono", numero: 8 },
      { label: "Alertas", numero: 9 },
    ]],
  },
];

export const generarPlanillaEndeMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ inspeccionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: insp } = await sb.from("inspecciones").select("*").eq("id", data.inspeccionId).single();
    if (!insp) throw new Error("Revisión no encontrada");
    if (insp.ciudad !== "ENDE Matriz") throw new Error("La planilla solo está disponible para el sitio ENDE Matriz");

    const [{ data: equipos }, { data: puntos }, { data: items }] = await Promise.all([
      sb.from("equipos").select("id,tag,marca,capacidad,modelo,categoria").eq("ciudad", "ENDE Matriz"),
      sb.from("puntos_inspeccion").select("id,equipo_id,numero,unidad,tipo"),
      sb.from("inspeccion_items").select("punto_id,equipo_id,valor,estado,semaforo,observaciones").eq("inspeccion_id", data.inspeccionId),
    ]);
    const standby = new Set<string>((insp.standby_equipos ?? []) as string[]);
    const sbObs = (insp.standby_observaciones ?? {}) as Record<string, string>;
    const punto = (eq: string, n: number) => (puntos ?? []).find((p) => p.equipo_id === eq && p.numero === n);
    const item = (pid?: number) => (pid ? (items ?? []).find((i) => i.punto_id === pid) : undefined);

    const valorDe = (eq: string, n: number) => {
      if (standby.has(eq)) return "STAND BY";
      const p = punto(eq, n);
      const it = item(p?.id);
      if (!it) return "";
      if (it.estado === "NA") return "N/A";
      if (it.valor) return it.valor.split(/[;|]/).map((s) => s.trim()).filter(Boolean).join(" / ");
      return it.estado ?? "";
    };
    const obsDe = (eq: string) => {
      if (standby.has(eq)) return `STAND BY${sbObs[eq] ? `: ${sbObs[eq]}` : ""}`;
      const its = (items ?? []).filter((i) => i.equipo_id === eq);
      const malos = its.filter((i) => i.semaforo === "rojo").length;
      const alertas = its.filter((i) => i.semaforo === "amarillo").length;
      const obs = its.map((i) => i.observaciones).filter(Boolean).join("; ");
      const estado = malos ? `FALLA (${malos})` : alertas ? `ALERTA (${alertas})` : its.length ? "OPERATIVO" : "";
      return [estado, obs].filter(Boolean).join(" · ");
    };
    const nombreEq = (id: string) => {
      const e = (equipos ?? []).find((x) => x.id === id);
      if (!e) return id;
      return `${e.tag}\n${e.modelo ?? e.categoria}\nMarca: ${e.marca ?? "—"}${e.capacidad ? `\nCapacidad: ${e.capacidad}` : ""}`;
    };

    const children: (Paragraph | Table)[] = [];
    children.push(new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [2400, 9600, 2400],
      rows: [new TableRow({ children: [
        new TableCell({ borders, width: { size: 2400, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "jpg", data: endesycLogoBytes(), transformation: { width: 80, height: 50 }, altText: { title: "ENDESYC", description: "Logotipo ENDESYC", name: "endesyc" } })] })] }),
        cell("REVISIÓN ESTADO EN EQUIPOS DE INFRAESTRUCTURA - DATA CENTER PRINCIPAL ENDE MATRIZ", 9600, { bold: true, size: 22 }),
        cell(`Semana ${insp.semana}\n${insp.fecha}`, 2400, { bold: true, size: 18 }),
      ] })],
    }));

    for (const g of GRUPOS) {
      const nCols = Math.max(...g.filas.map((f) => f.length));
      const eqW = 2200, obsW = 2600;
      const colW = Math.floor((W - eqW - obsW) / nCols);
      const widths = [eqW, ...Array(nCols).fill(colW), W - eqW - obsW - colW * nCols + obsW];
      const rows: TableRow[] = [
        new TableRow({ children: [cell("EQUIPO", eqW, { bold: true, fill: "BDD7EE" }), cell(g.titulo, W - eqW, { bold: true, fill: "BDD7EE", span: nCols + 1 })] }),
      ];
      for (const eq of g.equipos) {
        g.filas.forEach((fila, fi) => {
          const pad = nCols - fila.length;
          rows.push(new TableRow({ tableHeader: false, children: [
            ...(fi === 0 ? [cell("", eqW, { fill: "DDEBF7" })] : [cell("", eqW, { fill: "DDEBF7" })]),
            ...fila.map((c) => cell(c.label, colW, { bold: true, fill: "DDEBF7", size: 14 })),
            ...Array.from({ length: pad }, () => cell("", colW, { fill: "DDEBF7" })),
            cell(fi === 0 ? "ESTADO / OBSERVACIONES" : "", widths[widths.length - 1], { bold: true, fill: "DDEBF7", size: 14 }),
          ] }));
          rows.push(new TableRow({ children: [
            cell(fi === 0 ? nombreEq(eq) : "", eqW, { bold: true, size: 14, align: "left" }),
            ...fila.map((c) => cell(valorDe(eq, c.numero), colW, { size: 16 })),
            ...Array.from({ length: pad }, () => cell("", colW)),
            cell(fi === 0 ? obsDe(eq) : "", widths[widths.length - 1], { size: 14, align: "left" }),
          ] }));
        });
      }
      children.push(new Paragraph({ spacing: { before: 120 }, children: [] }));
      children.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows }));
    }

    children.push(new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: `FECHA: ${insp.fecha}`, bold: true, font: "Arial", size: 18 })] }));
    const half = W / 2;
    children.push(new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [half, half],
      rows: [
        new TableRow({ height: { value: 1100, rule: "atLeast" as never }, children: [cell("", half), cell("", half)] }),
        new TableRow({ children: [
          cell(`FIRMA RESPONSABLE\n${insp.tecnico ?? ""}${insp.cargo ? ` · ${insp.cargo}` : ""}\nENDE SERVICIOS Y CONSTRUCCIONES S.A.`, half, { bold: true, size: 16 }),
          cell(`FIRMA RESPONSABLE\n${insp.supervisor ?? ""}\nENDE MATRIZ`, half, { bold: true, size: 16 }),
        ] }),
      ],
    }));

    const doc = new Document({
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children,
      }],
    });
    const buf = await Packer.toBase64String(doc);
    return { filename: `Planilla_ENDE_Matriz_S${insp.semana}_${insp.fecha}.docx`, base64: buf };
  });

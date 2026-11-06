import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

type Equipo = { id: string; tag: string; categoria: string };
type Punto = { id: number; equipo_id: string; descripcion: string; tipo: string; unidad: string | null };
type Insp = { id: string; fecha: string; semana: number };

const COLORS = ["oklch(0.78 0.17 175)", "oklch(0.78 0.17 60)", "oklch(0.7 0.2 300)"];

/** Extrae hasta 3 valores numéricos (trifásicos) de un valor registrado. */
function valores(v: string | null): number[] {
  return (v ?? "").split(/[;/|]|\s+-\s+|\s+/).map((s) => parseFloat(s.replace(",", "."))).filter((n) => !isNaN(n)).slice(0, 3);
}

export function TendenciaParametro({ ciudad, equipos, puntos, insps }: {
  ciudad: string; equipos: Equipo[]; puntos: Punto[]; insps: Insp[];
}) {
  const [eqId, setEqId] = useState("");
  const [ptId, setPtId] = useState("");
  const [data, setData] = useState<Record<string, number | string | null>[]>([]);
  const [series, setSeries] = useState(1);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { setEqId(""); setPtId(""); setData([]); }, [ciudad]);
  const pts = useMemo(() => puntos.filter((p) => p.equipo_id === eqId && p.tipo === "numerico"), [puntos, eqId]);
  const punto = pts.find((p) => String(p.id) === ptId);

  useEffect(() => {
    if (!eqId || !ptId || !insps.length) { setData([]); return; }
    setCargando(true);
    let vivo = true;
    (async () => {
      const { data: rows } = await supabase.from("inspeccion_items").select("inspeccion_id,valor")
        .eq("equipo_id", eqId).eq("punto_id", Number(ptId)).in("inspeccion_id", insps.map((i) => i.id));
      if (!vivo) return;
      let max = 1;
      const serie = [...insps].reverse().map((i) => {
        const r = (rows ?? []).find((x) => x.inspeccion_id === i.id);
        const vs = valores(r?.valor ?? null);
        max = Math.max(max, vs.length);
        const d: Record<string, number | string | null> = { semana: `W${i.semana}`, fecha: i.fecha };
        vs.forEach((v, k) => { d[`v${k}`] = v; });
        return vs.length ? d : null;
      }).filter(Boolean) as Record<string, number | string | null>[];
      setSeries(max); setData(serie); setCargando(false);
    })();
    return () => { vivo = false; };
  }, [eqId, ptId, insps]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Tendencia de parámetros · {ciudad}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <label className="text-[11px] text-muted-foreground">Equipo
          <select value={eqId} onChange={(e) => { setEqId(e.target.value); setPtId(""); }}
            className="mt-1 w-full rounded-lg bg-input border border-border px-2 py-2 text-sm text-foreground">
            <option value="">Selecciona un equipo</option>
            {equipos.map((e) => <option key={e.id} value={e.id}>{e.tag} · {e.categoria}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-muted-foreground">Parámetro
          <select value={ptId} onChange={(e) => setPtId(e.target.value)} disabled={!eqId}
            className="mt-1 w-full rounded-lg bg-input border border-border px-2 py-2 text-sm text-foreground disabled:opacity-50">
            <option value="">{eqId && !pts.length ? "Sin parámetros numéricos" : "Selecciona un parámetro"}</option>
            {pts.map((p) => <option key={p.id} value={p.id}>{p.descripcion}{p.unidad ? ` (${p.unidad})` : ""}</option>)}
          </select>
        </label>
      </div>
      {!punto ? <p className="text-xs text-muted-foreground text-center py-6">Elige un equipo y un parámetro para ver su tendencia.</p>
        : cargando ? <p className="text-xs text-muted-foreground text-center py-6">Cargando…</p>
        : data.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">Sin datos registrados para este parámetro.</p>
        : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
              <XAxis dataKey="semana" tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
              <YAxis tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.02 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8, fontSize: 12 }} />
              {Array.from({ length: series }).map((_, k) => (
                <Line key={k} type="monotone" dataKey={`v${k}`} connectNulls
                  name={series > 1 ? `Fase ${k + 1}${punto.unidad ? ` (${punto.unidad})` : ""}` : `${punto.descripcion}${punto.unidad ? ` (${punto.unidad})` : ""}`}
                  stroke={COLORS[k]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
    </div>
  );
}

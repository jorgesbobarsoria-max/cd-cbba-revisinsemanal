import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { resumir } from "@/lib/evaluacion";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, ChevronRight, AlertTriangle, CheckCircle2, Calendar,
  Thermometer, Activity, Bell, BarChart3, Zap, ListChecks, Gauge,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type Inspeccion = {
  id: string; fecha: string; semana: number; tecnico: string | null; estado: string;
};
type Equipo = { id: string; tag: string; marca: string | null; modelo: string | null; categoria: string };
type Item = { equipo_id: string; punto_id: number; semaforo: string | null; valor: string | null; observaciones: string | null; accion_correctiva: string | null };
type Punto = { id: number; equipo_id: string; descripcion: string; tipo: string; unidad: string | null };

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
}

const COLORS = {
  ok: "oklch(0.78 0.17 165)",
  warn: "oklch(0.82 0.17 75)",
  fail: "oklch(0.68 0.22 25)",
  gray: "oklch(0.55 0.02 250)",
  primary: "oklch(0.78 0.17 175)",
};

function HomePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [insps, setInsps] = useState<Inspeccion[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [trend, setTrend] = useState<{ semana: string; alertas: number; ok: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ins }, { data: eqs }, { data: pts }] = await Promise.all([
        supabase.from("inspecciones").select("id,fecha,semana,tecnico,estado").order("fecha", { ascending: false }).limit(24),
        supabase.from("equipos").select("id,tag,marca,modelo,categoria").order("orden"),
        supabase.from("puntos_inspeccion").select("id,equipo_id,descripcion,tipo,unidad"),
      ]);
      setInsps(ins ?? []);
      setEquipos(eqs ?? []);
      setPuntos(pts ?? []);
      if (ins && ins.length > 0) setSelectedId(prev => prev ?? ins[0].id);
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedId || insps.length === 0) return;
    (async () => {
      const { data: it } = await supabase
        .from("inspeccion_items")
        .select("equipo_id,punto_id,semaforo,valor,observaciones,accion_correctiva")
        .eq("inspeccion_id", selectedId);
      setItems(it ?? []);

      // Tendencia: hasta 6 inspecciones desde la seleccionada hacia atrás, en orden cronológico
      const idx = insps.findIndex(i => i.id === selectedId);
      const window = insps.slice(idx, idx + 6).slice().reverse();
      const { data: allItems } = await supabase
        .from("inspeccion_items")
        .select("inspeccion_id,semaforo")
        .in("inspeccion_id", window.map(i => i.id));
      const map: Record<string, { alertas: number; ok: number; semana: string }> = {};
      window.forEach(i => { map[i.id] = { alertas: 0, ok: 0, semana: `W${i.semana}` }; });
      (allItems ?? []).forEach(r => {
        const m = map[r.inspeccion_id]; if (!m) return;
        if (r.semaforo === "amarillo" || r.semaforo === "rojo") m.alertas++;
        else if (r.semaforo === "verde") m.ok++;
      });
      setTrend(window.map(i => map[i.id]));
    })();
  }, [selectedId, insps]);

  const stats = useMemo(() => {
    // Motor compartido: misma regla que el formulario y los informes Word.
    const r = resumir(items, items.length);
    const ok = r.ok;
    const alerta = r.alerta;
    const falla = r.falla;
    const total = r.total;
    const equiposOk = equipos.filter(e => {
      const its = items.filter(i => i.equipo_id === e.id);
      return its.length > 0 && its.every(i => i.semaforo === "verde" || i.semaforo === "gris" || !i.semaforo);
    }).length;
    const evaluados = equipos.filter(e => items.some(i => i.equipo_id === e.id)).length;
    const disponibilidad = ok + alerta + falla > 0 ? r.disponibilidad : null;
    // Temp promedio: puntos con "temp" en descripcion
    const tempPts = puntos.filter(p => /temp/i.test(p.descripcion) && p.tipo === "numerico");
    const tempVals = items
      .filter(i => tempPts.some(p => p.id === i.punto_id))
      .map(i => parseFloat((i.valor ?? "").replace(",", ".")))
      .filter(n => !isNaN(n));
    const tempProm = tempVals.length > 0 ? (tempVals.reduce((a, b) => a + b, 0) / tempVals.length).toFixed(1) : null;
    return { ok, alerta, falla, total, equiposOk, evaluados, disponibilidad, tempProm, alertaTotal: alerta + falla };
  }, [items, equipos, puntos]);

  const tempPorUnidad = useMemo(() => {
    const tempPts = puntos.filter(p => /temp/i.test(p.descripcion) && p.tipo === "numerico");
    return equipos
      .map(e => {
        const vals = items
          .filter(i => i.equipo_id === e.id && tempPts.some(p => p.id === i.punto_id))
          .map(i => parseFloat((i.valor ?? "").replace(",", ".")))
          .filter(n => !isNaN(n));
        const t = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return { tag: e.tag, temp: t };
      })
      .filter(d => d.temp != null)
      .slice(0, 10);
  }, [equipos, puntos, items]);

  const distEstado = useMemo(() => {
    const c = { Normal: stats.ok, Advertencia: stats.alerta, Crítico: stats.falla };
    return Object.entries(c).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const porCategoria = useMemo(() => {
    const cats: Record<string, { categoria: string; ok: number; alerta: number; falla: number }> = {};
    equipos.forEach(e => {
      const c = cats[e.categoria] ??= { categoria: e.categoria, ok: 0, alerta: 0, falla: 0 };
      items.filter(i => i.equipo_id === e.id).forEach(i => {
        if (i.semaforo === "verde") c.ok++;
        else if (i.semaforo === "amarillo") c.alerta++;
        else if (i.semaforo === "rojo") c.falla++;
      });
    });
    return Object.values(cats);
  }, [equipos, items]);

  const acciones = useMemo(() => {
    return items
      .filter(i => (i.semaforo === "amarillo" || i.semaforo === "rojo"))
      .map(i => {
        const eq = equipos.find(e => e.id === i.equipo_id);
        const pt = puntos.find(p => p.id === i.punto_id);
        return {
          prio: i.semaforo === "rojo" ? "Alta" : "Media",
          equipo: eq?.tag ?? i.equipo_id,
          param: pt?.descripcion ?? `#${i.punto_id}`,
          obs: i.observaciones || i.accion_correctiva || "Revisar parámetro",
          color: i.semaforo === "rojo" ? "fail" : "warn",
        };
      })
      .slice(0, 8);
  }, [items, equipos, puntos]);

  const nuevaInspeccion = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const today = new Date();
      const { data, error } = await supabase
        .from("inspecciones")
        .insert({
          user_id: user.id,
          fecha: today.toISOString().slice(0, 10),
          semana: getWeekNumber(today),
          tecnico: user.user_metadata?.full_name ?? user.email,
        })
        .select("id").single();
      if (error) throw error;
      nav({ to: "/inspeccion/$id", params: { id: data.id } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally { setBusy(false); }
  };

  if (loading) return null;
  const selected = insps.find(i => i.id === selectedId);
  const semana = selected?.semana ?? getWeekNumber(new Date());
  const year = selected ? new Date(selected.fecha).getFullYear() : new Date().getFullYear();

  return (
    <AppShell title="Dashboard">
      <section className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Revisión Semanal</p>
          <h2 className="text-xl font-bold mt-0.5">DC Cochabamba</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hola, <span className="text-foreground">{user?.user_metadata?.full_name ?? user?.email?.split("@")[0]}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-mono font-semibold">
            {year}-W{semana}
          </div>
        </div>
      </section>

      {/* Selector de semana */}
      <section className="glass rounded-2xl p-3 mb-4 flex items-center gap-2">
        <Calendar className="size-4 text-primary shrink-0" />
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">Semana</label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          disabled={insps.length === 0}
          className="flex-1 min-w-0 bg-transparent border border-border/60 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/60"
        >
          {insps.length === 0 && <option value="">Sin revisiones</option>}
          {insps.map(i => {
            const y = new Date(i.fecha).getFullYear();
            return (
              <option key={i.id} value={i.id}>
                {y}-W{i.semana} · {i.fecha} {i.estado === "finalizado" ? "✓" : "•"}
              </option>
            );
          })}
        </select>
      </section>


      <button
        onClick={nuevaInspeccion}
        disabled={busy}
        className="w-full glass rounded-2xl p-4 flex items-center justify-between mb-5 group hover:border-primary/60 transition-all"
      >
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Iniciar</p>
          <p className="text-base font-semibold mt-0.5">Nueva revisión semanal</p>
          <p className="text-[11px] text-muted-foreground">{equipos.length} equipos registrados</p>
        </div>
        <div className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center group-hover:scale-105 transition-transform shadow-[0_0_24px_oklch(0.78_0.17_175_/_0.4)]">
          <Plus className="size-5" />
        </div>
      </button>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-2 mb-5">
        <KpiCard icon={CheckCircle2} iconColor="text-ok" title="Disponibilidad"
          value={stats.disponibilidad != null ? `${stats.disponibilidad}%` : "--"}
          sub="Meta: ≥ 95%" />
        <KpiCard icon={BarChart3} iconColor="text-primary" title="Equipos OK"
          value={`${stats.equiposOk}/${equipos.length}`}
          sub="Operativos / Total" />
        <KpiCard icon={AlertTriangle} iconColor="text-fail" title="Alertas Activas"
          value={String(stats.alertaTotal)}
          sub="Requieren atención" />
        <KpiCard icon={Thermometer} iconColor="text-warn" title="Temp. Promedio"
          value={stats.tempProm != null ? `${stats.tempProm}°C` : "--"}
          sub="Rango: 18-27°C" />
      </section>

      {/* Charts */}
      <section className="space-y-3 mb-5">
        <ChartCard icon={Thermometer} title="Temperatura por Unidad (°C)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tempPorUnidad} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
              <XAxis dataKey="tag" tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
              <YAxis tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.02 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="temp" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={Activity} title="Distribución de Estado">
          {distEstado.length === 0 ? (
            <EmptyMini label="Sin datos aún" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={distEstado} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={32} paddingAngle={2}>
                  {distEstado.map((d, i) => (
                    <Cell key={i} fill={d.name === "Normal" ? COLORS.ok : d.name === "Advertencia" ? COLORS.warn : COLORS.fail} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.2 0.02 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard icon={Bell} iconColor="text-warn" title="Tendencia de Alertas">
          {trend.length === 0 ? <EmptyMini label="Sin historial" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
                <XAxis dataKey="semana" tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
                <YAxis tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "oklch(0.2 0.02 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="alertas" name="Alertas" stroke={COLORS.fail} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ok" name="Sin Alertas" stroke={COLORS.ok} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard icon={BarChart3} title="Estado por Categoría">
          {porCategoria.length === 0 ? <EmptyMini label="Sin datos" /> : (
            <ResponsiveContainer width="100%" height={Math.max(180, porCategoria.length * 38)}>
              <BarChart data={porCategoria} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
                <XAxis type="number" tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
                <YAxis dataKey="categoria" type="category" width={92} tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "oklch(0.2 0.02 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ok" name="Normal" stackId="a" fill={COLORS.ok} />
                <Bar dataKey="alerta" name="Advertencia" stackId="a" fill={COLORS.warn} />
                <Bar dataKey="falla" name="Crítico" stackId="a" fill={COLORS.fail} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Acciones Pendientes */}
      <section className="glass rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Acciones Pendientes</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
            {acciones.length} pendientes
          </span>
        </div>
        {acciones.length === 0 ? (
          <p className="text-center py-6 text-xs text-muted-foreground">Sin acciones pendientes 🎉</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {acciones.map((a, i) => (
              <li key={i} className="py-2.5 flex items-start gap-3">
                <span className={`mt-1 size-2 rounded-full shrink-0 ${a.color === "fail" ? "bg-fail" : "bg-warn"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase tracking-wider font-bold ${a.color === "fail" ? "text-fail" : "text-warn"}`}>
                      {a.prio}
                    </span>
                    <span className="text-xs font-semibold truncate">{a.equipo}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{a.param}</p>
                  <p className="text-[11px] text-foreground/80 truncate mt-0.5">{a.obs}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Últimas revisiones */}
      <section className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <Gauge className="size-4 text-primary" /> Últimas revisiones
          </h3>
          <Link to="/historial" className="text-xs text-primary">Ver todo</Link>
        </div>
        <div className="space-y-2">
          {insps.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground glass rounded-xl">
              <Calendar className="size-7 mx-auto mb-2 opacity-50" />
              Aún no hay revisiones.
            </div>
          )}
          {insps.slice(0, 4).map((i) => (
            <Link key={i.id} to="/inspeccion/$id" params={{ id: i.id }}
              className="glass rounded-xl p-3 flex items-center justify-between hover:border-primary/40 transition">
              <div>
                <p className="text-sm font-medium">Semana {i.semana}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{i.fecha}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                  i.estado === "finalizado" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
                }`}>{i.estado}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function KpiCard({ icon: Icon, iconColor, title, value, sub }: { icon: React.ElementType; iconColor: string; title: string; value: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">{title}</p>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold font-mono leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function ChartCard({ icon: Icon, iconColor = "text-primary", title, children }: { icon: React.ElementType; iconColor?: string; title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`size-4 ${iconColor}`} />
        <h3 className="text-xs font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyMini({ label }: { label: string }) {
  return <p className="text-center py-10 text-xs text-muted-foreground">{label}</p>;
}

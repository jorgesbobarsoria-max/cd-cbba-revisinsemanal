import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ChevronRight, Activity, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type Inspeccion = {
  id: string;
  fecha: string;
  semana: number;
  tecnico: string | null;
  estado: string;
};

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
}

function HomePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [insps, setInsps] = useState<Inspeccion[]>([]);
  const [stats, setStats] = useState({ total: 0, ok: 0, alerta: 0, falla: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("inspecciones")
        .select("id,fecha,semana,tecnico,estado")
        .order("fecha", { ascending: false })
        .limit(5);
      setInsps(data ?? []);

      // Last inspection stats
      if (data && data.length > 0) {
        const { data: items } = await supabase
          .from("inspeccion_items")
          .select("semaforo")
          .eq("inspeccion_id", data[0].id);
        if (items) {
          setStats({
            total: items.length,
            ok: items.filter(i => i.semaforo === "verde").length,
            alerta: items.filter(i => i.semaforo === "amarillo").length,
            falla: items.filter(i => i.semaforo === "rojo").length,
          });
        }
      }
    })();
  }, [user]);

  const nuevaInspeccion = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const today = new Date();
      const fecha = today.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("inspecciones")
        .insert({
          user_id: user.id,
          fecha,
          semana: getWeekNumber(today),
          tecnico: user.user_metadata?.full_name ?? user.email,
        })
        .select("id")
        .single();
      if (error) throw error;
      nav({ to: "/inspeccion/$id", params: { id: data.id } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <AppShell title="Inicio">
      <section className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Bienvenido</p>
        <h2 className="text-2xl font-bold mt-0.5">
          {user?.user_metadata?.full_name ?? user?.email?.split("@")[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Semana <span className="text-foreground font-mono">{getWeekNumber(new Date())}</span> · Inspección de equipamiento crítico
        </p>
      </section>

      <button
        onClick={nuevaInspeccion}
        disabled={busy}
        className="w-full glass rounded-2xl p-5 flex items-center justify-between mb-6 group hover:border-primary/60 transition-all"
      >
        <div className="text-left">
          <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">Iniciar</p>
          <p className="text-lg font-semibold mt-0.5">Nueva revisión semanal</p>
          <p className="text-xs text-muted-foreground">12 equipos · 49 puntos de control</p>
        </div>
        <div className="size-12 rounded-xl bg-primary text-primary-foreground grid place-items-center group-hover:scale-105 transition-transform shadow-[0_0_24px_oklch(0.78_0.17_175_/_0.4)]">
          <Plus className="size-6" />
        </div>
      </button>

      <section className="grid grid-cols-3 gap-2 mb-6">
        <StatCard icon={CheckCircle2} label="OK" value={stats.ok} color="text-ok" />
        <StatCard icon={AlertTriangle} label="Alerta" value={stats.alerta} color="text-warn" />
        <StatCard icon={Activity} label="Falla" value={stats.falla} color="text-fail" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider">Últimas revisiones</h3>
          <Link to="/historial" className="text-xs text-primary">Ver todo</Link>
        </div>
        <div className="space-y-2">
          {insps.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground glass rounded-xl">
              <Calendar className="size-8 mx-auto mb-2 opacity-50" />
              Aún no hay revisiones registradas.
            </div>
          )}
          {insps.map((i) => (
            <Link
              key={i.id}
              to="/inspeccion/$id"
              params={{ id: i.id }}
              className="glass rounded-xl p-4 flex items-center justify-between hover:border-primary/40 transition"
            >
              <div>
                <p className="text-sm font-medium">Semana {i.semana}</p>
                <p className="text-xs text-muted-foreground font-mono">{i.fecha}</p>
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

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <Icon className={`size-4 mx-auto ${color}`} />
      <p className="text-2xl font-mono font-semibold mt-1">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

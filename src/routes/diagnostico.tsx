import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { CIUDADES } from "@/lib/sitios";
import { diagnosticarFalla } from "@/lib/diagnostico.functions";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/diagnostico")({
  head: () => ({ meta: [
    { title: "Diagnóstico de fallas con IA · DC Inspect" },
    { name: "description", content: "Describe una falla y obtén causas probables y pasos de revisión basados en el historial del equipo." },
    { property: "og:title", content: "Diagnóstico de fallas con IA · DC Inspect" },
    { property: "og:description", content: "Causas probables y pasos de revisión según parámetros e historial de alertas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DiagnosticoPage,
});

type Eq = { id: string; tag: string; categoria: string };

function DiagnosticoPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: perfilLoading } = useProfile();
  const nav = useNavigate();
  const diagnosticar = useServerFn(diagnosticarFalla);
  const [ciudad, setCiudad] = useState<string>(CIUDADES[0]);
  const [equipos, setEquipos] = useState<Eq[]>([]);
  const [equipoId, setEquipoId] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ analisis: string; equipo: string; revisiones: number; alertas: number } | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);
  useEffect(() => {
    const c = window.localStorage.getItem("dc_ciudad");
    if (c && CIUDADES.includes(c)) setCiudad(c);
  }, []);
  useEffect(() => {
    if (!user) return;
    supabase.from("equipos").select("id,tag,categoria").eq("ciudad", ciudad).order("orden")
      .then(({ data }) => { setEquipos(data ?? []); setEquipoId(""); });
  }, [user, ciudad]);

  async function analizar() {
    if (!equipoId) return toast.error("Selecciona un equipo");
    if (desc.trim().length < 10) return toast.error("Describe la falla con más detalle");
    setBusy(true); setRes(null);
    try {
      setRes(await diagnosticar({ data: { equipo_id: equipoId, descripcion: desc } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo analizar");
    } finally { setBusy(false); }
  }

  if (!loading && !perfilLoading && user && !isAdmin) {
    return (
      <AppShell title="Diagnóstico IA">
        <section className="glass rounded-2xl p-6 text-center space-y-2 mt-8">
          <Sparkles className="size-8 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold">Solo administradores</h2>
          <p className="text-sm text-muted-foreground">El diagnóstico con IA está disponible únicamente para cuentas con rol de administrador.</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Diagnóstico IA">
      <section className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Asistente de fallas</p>
        <h2 className="text-xl font-bold mt-0.5 flex items-center gap-2"><Sparkles className="size-5 text-primary" /> Diagnóstico con IA</h2>
        <p className="text-xs text-muted-foreground mt-1">Describe la falla. La IA revisa los parámetros y el historial de alertas del equipo y sugiere causas y pasos de revisión.</p>
      </section>

      <section className="mb-3 flex gap-2">
        {CIUDADES.map((c) => (
          <button key={c} onClick={() => setCiudad(c)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold border transition ${ciudad === c ? "bg-primary/15 border-primary/50 text-primary" : "glass text-muted-foreground border-border/60"}`}>
            <MapPin className="size-3.5 inline mr-1 -mt-0.5" />{c}
          </button>
        ))}
      </section>

      <section className="glass rounded-2xl p-3.5 space-y-3 mb-4">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Equipo</span>
          <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)}
            className="mt-1 w-full bg-background border border-border/60 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-primary/60">
            <option value="">Selecciona un equipo…</option>
            {equipos.map((e) => <option key={e.id} value={e.id}>{e.tag} · {e.categoria}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Descripción de la falla</span>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} maxLength={2000}
            placeholder="Ej.: El aire A-1 muestra alarma de alta presión y la temperatura de retorno subió a 29 °C desde la mañana…"
            className="mt-1 w-full bg-background border border-border/60 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-primary/60" />
          <span className="text-[10px] text-muted-foreground">{desc.length}/2000</span>
        </label>
        <Button className="w-full" onClick={analizar} disabled={busy}>
          {busy ? <><Loader2 className="size-4 animate-spin" /> Analizando…</> : <><Sparkles className="size-4" /> Analizar falla</>}
        </Button>
      </section>

      {res && (
        <section className="glass rounded-2xl p-4 mb-4">
          <p className="text-[11px] text-muted-foreground mb-2">
            {res.equipo} · {res.revisiones} revisiones analizadas · {res.alertas} alertas/fallas en el historial
          </p>
          <Markdown text={res.analisis} />
          <p className="text-[10px] text-muted-foreground mt-3 border-t border-border/40 pt-2">Sugerencias generadas con IA. Verifica siempre en sitio y sigue los procedimientos de seguridad.</p>
        </section>
      )}
    </AppShell>
  );
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm">
      {text.split("\n").map((l, i) => {
        const t = l.trim();
        if (!t) return null;
        if (/^#{1,4}\s/.test(t)) return <h3 key={i} className="text-xs uppercase tracking-wider font-bold text-primary pt-2">{t.replace(/^#+\s*/, "")}</h3>;
        const num = t.match(/^(\d+)[.)]\s+(.*)/);
        if (num) return <p key={i} className="pl-1"><span className="font-mono text-primary mr-1.5">{num[1]}.</span>{inline(num[2])}</p>;
        if (/^[-*]\s/.test(t)) return <p key={i} className="pl-1 flex gap-1.5"><span className="text-primary">•</span><span>{inline(t.slice(2))}</span></p>;
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}

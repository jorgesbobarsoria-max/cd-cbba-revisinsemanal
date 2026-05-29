import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Semaforo, evaluar } from "@/components/semaforo";
import { ChevronDown, Save, Trash2, CheckCircle2, Loader2, Thermometer, Battery, Zap, Flame, Activity, Wind } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inspeccion/$id")({
  component: InspeccionPage,
});

type Equipo = { id: string; categoria: string; tag: string; marca: string | null; modelo: string | null; ubicacion: string | null; criticidad: string | null; orden: number };
type Punto = { id: number; equipo_id: string; numero: number; descripcion: string; tipo: string; unidad: string | null; min_ok: number | null; max_ok: number | null; min_alerta: number | null; max_alerta: number | null };
type Item = { id?: string; punto_id: number; equipo_id: string; estado?: string; valor?: string; semaforo?: string; observaciones?: string; accion_correctiva?: string };

const iconCat: Record<string, React.ElementType> = {
  "Aire de Precisión": Wind,
  UPS: Battery,
  ATS: Zap,
  "Grupo Generador": Zap,
  "Sup. Incendios": Flame,
  "Sensores Sala": Thermometer,
};

function InspeccionPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [items, setItems] = useState<Record<number, Item>>({});
  const [insp, setInsp] = useState<{ fecha: string; semana: number; tecnico: string | null; turno: string | null; estado: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!authLoading && !user) nav({ to: "/auth" }); }, [user, authLoading, nav]);

  useEffect(() => {
    (async () => {
      const [eq, pt, ins, it] = await Promise.all([
        supabase.from("equipos").select("*").order("orden"),
        supabase.from("puntos_inspeccion").select("*").order("numero"),
        supabase.from("inspecciones").select("fecha,semana,tecnico,turno,estado").eq("id", id).single(),
        supabase.from("inspeccion_items").select("*").eq("inspeccion_id", id),
      ]);
      setEquipos(eq.data ?? []);
      setPuntos(pt.data ?? []);
      setInsp(ins.data);
      const map: Record<number, Item> = {};
      (it.data ?? []).forEach((r) => {
        map[r.punto_id] = { id: r.id, punto_id: r.punto_id, equipo_id: r.equipo_id, estado: r.estado ?? undefined, valor: r.valor ?? undefined, semaforo: r.semaforo ?? undefined, observaciones: r.observaciones ?? undefined, accion_correctiva: r.accion_correctiva ?? undefined };
      });
      setItems(map);
      setOpen(eq.data?.[0]?.id ?? null);
      setLoading(false);
    })();
  }, [id]);

  const update = (punto: Punto, patch: Partial<Item>) => {
    setItems((cur) => {
      const prev = cur[punto.id] ?? { punto_id: punto.id, equipo_id: punto.equipo_id };
      const next = { ...prev, ...patch };
      next.semaforo = evaluar(next.valor, punto, next.estado);
      return { ...cur, [punto.id]: next };
    });
  };

  const guardar = async (finalizar = false) => {
    setSaving(true);
    try {
      const rows = Object.values(items).map((it) => ({
        inspeccion_id: id,
        punto_id: it.punto_id,
        equipo_id: it.equipo_id,
        estado: it.estado ?? null,
        valor: it.valor ?? null,
        semaforo: it.semaforo ?? null,
        observaciones: it.observaciones ?? null,
        accion_correctiva: it.accion_correctiva ?? null,
      }));
      await supabase.from("inspeccion_items").delete().eq("inspeccion_id", id);
      if (rows.length) {
        const { error } = await supabase.from("inspeccion_items").insert(rows);
        if (error) throw error;
      }
      if (finalizar) {
        await supabase.from("inspecciones").update({ estado: "finalizado", updated_at: new Date().toISOString() }).eq("id", id);
        toast.success("Inspección finalizada y guardada");
        nav({ to: "/historial" });
      } else {
        toast.success("Borrador guardado");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!confirm("¿Eliminar esta inspección?")) return;
    await supabase.from("inspecciones").delete().eq("id", id);
    toast.success("Eliminada");
    nav({ to: "/historial" });
  };

  if (loading) return <AppShell title="Cargando..."><div className="grid place-items-center py-20"><Loader2 className="animate-spin text-primary" /></div></AppShell>;

  // resumen
  const all = Object.values(items);
  const ok = all.filter((i) => i.semaforo === "verde").length;
  const al = all.filter((i) => i.semaforo === "amarillo").length;
  const fa = all.filter((i) => i.semaforo === "rojo").length;
  const na = all.filter((i) => i.semaforo === "gris").length;
  const totalPuntos = puntos.length;
  const disp = totalPuntos ? Math.round((ok / totalPuntos) * 100) : 0;

  return (
    <AppShell title={`Semana ${insp?.semana ?? "—"}`}>
      {/* Encabezado */}
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Fecha</p>
            <p className="font-mono font-semibold">{insp?.fecha}</p>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-semibold ${insp?.estado === "finalizado" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>{insp?.estado}</span>
        </div>
        <input
          placeholder="Técnico responsable"
          defaultValue={insp?.tecnico ?? ""}
          onBlur={(e) => supabase.from("inspecciones").update({ tecnico: e.target.value }).eq("id", id)}
          className="mt-3 w-full bg-surface-1 border border-border rounded-lg px-3 h-10 text-sm focus:outline-none focus:border-primary"
        />
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="text-center bg-ok/10 rounded-lg py-2"><p className="text-lg font-mono font-bold text-ok">{ok}</p><p className="text-[9px] uppercase text-muted-foreground">OK</p></div>
          <div className="text-center bg-warn/10 rounded-lg py-2"><p className="text-lg font-mono font-bold text-warn">{al}</p><p className="text-[9px] uppercase text-muted-foreground">Alerta</p></div>
          <div className="text-center bg-fail/10 rounded-lg py-2"><p className="text-lg font-mono font-bold text-fail">{fa}</p><p className="text-[9px] uppercase text-muted-foreground">Falla</p></div>
          <div className="text-center bg-muted/30 rounded-lg py-2"><p className="text-lg font-mono font-bold">{na}</p><p className="text-[9px] uppercase text-muted-foreground">N/A</p></div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="uppercase tracking-wider text-muted-foreground">Disponibilidad</span>
            <span className="font-mono font-bold text-primary">{disp}%</span>
          </div>
          <div className="h-2 bg-surface-1 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-ok" style={{ width: `${disp}%` }} />
          </div>
        </div>
      </div>

      {/* Equipos */}
      <div className="space-y-2 mb-6">
        {equipos.map((eq) => {
          const eqPuntos = puntos.filter((p) => p.equipo_id === eq.id);
          if (eqPuntos.length === 0) return null;
          const isOpen = open === eq.id;
          const eqItems = eqPuntos.map((p) => items[p.id]).filter(Boolean);
          const eqOk = eqItems.filter((i) => i?.semaforo === "verde").length;
          const eqFail = eqItems.filter((i) => i?.semaforo === "rojo").length;
          const eqAlert = eqItems.filter((i) => i?.semaforo === "amarillo").length;
          const Icon = iconCat[eq.categoria] ?? Activity;
          return (
            <div key={eq.id} className="glass rounded-2xl overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : eq.id)} className="w-full p-4 flex items-center gap-3 text-left">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/30 grid place-items-center">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{eq.categoria}</p>
                  <p className="font-semibold truncate">{eq.tag} <span className="text-muted-foreground font-normal text-xs">· {eq.marca}</span></p>
                </div>
                <div className="flex items-center gap-1">
                  {eqFail > 0 && <span className="size-2 rounded-full bg-fail" />}
                  {eqAlert > 0 && <span className="size-2 rounded-full bg-warn" />}
                  {eqOk > 0 && <span className="size-2 rounded-full bg-ok" />}
                  <span className="text-xs text-muted-foreground font-mono ml-1">{eqItems.length}/{eqPuntos.length}</span>
                </div>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                  {eqPuntos.map((p) => {
                    const it = items[p.id];
                    return (
                      <div key={p.id} className="bg-surface-1 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium leading-tight">
                            <span className="text-muted-foreground font-mono mr-1.5">{p.numero}.</span>
                            {p.descripcion}
                            {p.unidad && <span className="text-muted-foreground"> ({p.unidad})</span>}
                          </p>
                          <Semaforo estado={it?.semaforo} />
                        </div>

                        {/* Estado buttons */}
                        <div className="grid grid-cols-4 gap-1 mb-2">
                          {(["OK", "ALERTA", "FALLA", "NA"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => update(p, { estado: s })}
                              className={`py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition ${
                                it?.estado === s
                                  ? s === "OK" ? "bg-ok text-ok-foreground"
                                  : s === "ALERTA" ? "bg-warn text-warn-foreground"
                                  : s === "FALLA" ? "bg-fail text-fail-foreground"
                                  : "bg-muted text-foreground"
                                  : "bg-background/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >{s === "NA" ? "N/A" : s}</button>
                          ))}
                        </div>

                        {p.tipo === "numerico" && (
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={`Valor ${p.unidad ?? ""} (rango OK: ${p.min_ok}–${p.max_ok})`}
                            value={it?.valor ?? ""}
                            onChange={(e) => update(p, { valor: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm font-mono focus:outline-none focus:border-primary mb-2"
                          />
                        )}

                        <textarea
                          placeholder="Observaciones / acción correctiva..."
                          value={it?.observaciones ?? ""}
                          onChange={(e) => update(p, { observaciones: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary resize-none"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botones */}
      <div className="sticky bottom-20 grid grid-cols-3 gap-2">
        <button onClick={eliminar} className="h-12 rounded-xl bg-fail/15 text-fail font-semibold flex items-center justify-center gap-1.5">
          <Trash2 className="size-4" />
        </button>
        <button onClick={() => guardar(false)} disabled={saving} className="h-12 rounded-xl bg-secondary font-semibold flex items-center justify-center gap-1.5">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar
        </button>
        <button onClick={() => guardar(true)} disabled={saving} className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5 shadow-[0_0_24px_oklch(0.78_0.17_175_/_0.4)]">
          <CheckCircle2 className="size-4" />
          Finalizar
        </button>
      </div>
    </AppShell>
  );
}

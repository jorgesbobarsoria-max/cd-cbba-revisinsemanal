import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { Semaforo } from "@/components/semaforo";
import { evaluarPunto, resumir, validarNumerico as validarNumericoBase, cantidadValores } from "@/lib/evaluacion";
import { ChevronLeft, ChevronRight, Save, Trash2, CheckCircle2, Loader2, Thermometer, Battery, Zap, Flame, Activity, Wind, FileDown, Power, Lock } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generarInformeWord } from "@/lib/reporte.functions";
import { PhotoCapture } from "@/components/photo-capture";
import { listEvidencias, type EvidenciaRow } from "@/lib/photo-utils";


export const Route = createFileRoute("/inspeccion/$id")({
  component: InspeccionPage,
});

type Equipo = { id: string; categoria: string; tag: string; marca: string | null; modelo: string | null; ubicacion: string | null; criticidad: string | null; orden: number };
type Punto = { id: number; equipo_id: string; numero: number; descripcion: string; tipo: string; unidad: string | null; min_ok: number | null; max_ok: number | null; min_alerta: number | null; max_alerta: number | null; valores_count?: number | null; etiquetas_valores?: string[] | null; respuesta_esperada?: string | null; severidad?: string | null; obligatorio?: boolean | null };
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
  const { user, loading: authLoading, permisos } = useProfile();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [items, setItems] = useState<Record<number, Item>>({});
  const [insp, setInsp] = useState<{ fecha: string; semana: number; tecnico: string | null; turno: string | null; estado: string } | null>(null);
  const [standby, setStandby] = useState<Set<string>>(new Set());
  const [cab, setCab] = useState<Record<string, string>>({});
  const [verCab, setVerCab] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportar = useServerFn(generarInformeWord);
  const [evidencias, setEvidencias] = useState<EvidenciaRow[]>([]);

  // Un registro finalizado queda bloqueado salvo para administradores.
  const soloLectura =
    !permisos.puedeCapturar || (insp?.estado === "finalizado" && !permisos.puedeEditarFinalizado);

  const isAcCategoria = (c: string) => /aire/i.test(c);

  const reloadEvidencias = async () => {
    setEvidencias(await listEvidencias({ inspeccion_id: id }));
  };
  useEffect(() => { reloadEvidencias(); }, [id]);

  const descargarWord = async () => {
    setExporting(true);
    try {
      const res = await exportar({ data: { inspeccionId: id } });
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = res.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("Informe Word descargado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  };


  useEffect(() => { if (!authLoading && !user) nav({ to: "/auth" }); }, [user, authLoading, nav]);

  useEffect(() => {
    (async () => {
      const [eq, pt, ins, it] = await Promise.all([
        supabase.from("equipos").select("*").order("orden"),
        supabase.from("puntos_inspeccion").select("*").order("numero"),
        supabase.from("inspecciones").select("fecha,semana,tecnico,turno,supervisor,cargo,condicion_clima,temp_sala,hr_sala,carga_it,pue,proxima_revision,estado,standby_equipos").eq("id", id).single(),
        supabase.from("inspeccion_items").select("*").eq("inspeccion_id", id),
      ]);
      setEquipos(eq.data ?? []);
      setPuntos(pt.data ?? []);
      setInsp(ins.data);
      setStandby(new Set(((ins.data as any)?.standby_equipos ?? []) as string[]));
      const d = (ins.data ?? {}) as Record<string, unknown>;
      setCab({
        turno: (d.turno as string) ?? "",
        supervisor: (d.supervisor as string) ?? "",
        cargo: (d.cargo as string) ?? "",
        condicion_clima: (d.condicion_clima as string) ?? "",
        temp_sala: d.temp_sala != null ? String(d.temp_sala) : "",
        hr_sala: d.hr_sala != null ? String(d.hr_sala) : "",
        carga_it: d.carga_it != null ? String(d.carga_it) : "",
        pue: d.pue != null ? String(d.pue) : "",
        proxima_revision: (d.proxima_revision as string) ?? "",
      });
      const map: Record<number, Item> = {};
      (it.data ?? []).forEach((r) => {
        map[r.punto_id] = { id: r.id, punto_id: r.punto_id, equipo_id: r.equipo_id, estado: r.estado ?? undefined, valor: r.valor ?? undefined, semaforo: r.semaforo ?? undefined, observaciones: r.observaciones ?? undefined, accion_correctiva: r.accion_correctiva ?? undefined };
      });
      setItems(map);
      setOpen(eq.data?.[0]?.id ?? null);
      setLoading(false);
    })();
  }, [id]);

  const toggleStandby = (equipoId: string) => {
    setStandby((cur) => {
      const next = new Set(cur);
      if (next.has(equipoId)) next.delete(equipoId);
      else next.add(equipoId);
      return next;
    });
    // limpiar items del equipo cuando entra en stand by
    setItems((cur) => {
      const willBeStandby = !standby.has(equipoId);
      if (!willBeStandby) return cur;
      const eqPuntos = puntos.filter((p) => p.equipo_id === equipoId).map((p) => p.id);
      const next = { ...cur };
      for (const pid of eqPuntos) delete next[pid];
      return next;
    });
  };

  const update = (punto: Punto, patch: Partial<Item>) => {
    setItems((cur) => {
      const prev = cur[punto.id] ?? { punto_id: punto.id, equipo_id: punto.equipo_id };
      const next = { ...prev, ...patch };
      next.semaforo = evaluarPunto(next.valor, punto, next.estado);
      return { ...cur, [punto.id]: next };
    });
  };

  // Valida un punto numérico (mono o multi-valor) usando el motor compartido.
  const validarNumerico = (p: Punto, raw: string | undefined) => {
    const r = validarNumericoBase(p, raw);
    return { perValue: r.porValor, global: r.global, hasBlocking: r.bloqueante };
  };

  // Recolecta todos los errores bloqueantes de la inspección (excluye equipos en stand by).
  const recolectarErrores = (): { punto: Punto; msg: string }[] => {
    const errs: { punto: Punto; msg: string }[] = [];
    for (const p of puntos) {
      if (standby.has(p.equipo_id)) continue;
      if (p.tipo !== "numerico") continue;
      const it = items[p.id];
      if (!it?.valor) continue;
      const v = validarNumerico(p, it.valor);
      if (!v.hasBlocking) continue;
      if (v.global) errs.push({ punto: p, msg: v.global });
      v.perValue.forEach((m, i) => { if (m) errs.push({ punto: p, msg: `Valor ${i + 1}: ${m}` }); });
    }
    return errs;
  };

  const guardar = async (finalizar = false) => {
    if (soloLectura) {
      toast.error("No tienes permisos para modificar esta revisión");
      return;
    }
    // Al finalizar no se admiten puntos obligatorios sin registrar.
    if (finalizar) {
      const pendientes = puntos.filter(
        (p) =>
          !standby.has(p.equipo_id) &&
          (p.obligatorio ?? true) &&
          !items[p.id]?.estado &&
          !(items[p.id]?.valor ?? "").trim(),
      );
      if (pendientes.length > 0) {
        const eqp = equipos.find((e) => e.id === pendientes[0].equipo_id);
        if (eqp) setOpen(eqp.id);
        toast.error(`Faltan ${pendientes.length} punto(s) obligatorio(s) por registrar`, {
          description: `${eqp?.tag ?? ""} · ${pendientes[0].descripcion}`,
        });
        return;
      }
    }
    const errs = recolectarErrores();
    if (errs.length > 0) {
      const first = errs[0];
      const eq = equipos.find((e) => e.id === first.punto.equipo_id);
      if (eq) setOpen(eq.id);
      toast.error(`Hay ${errs.length} error(es) en los valores registrados`, {
        description: `${eq?.tag ?? ""} · ${first.punto.descripcion}: ${first.msg}`,
      });
      return;
    }
    setSaving(true);
    try {
      const standbyArr = Array.from(standby);
      const rows = Object.values(items)
        .filter((it) => !standby.has(it.equipo_id))
        .map((it) => ({
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
      const numOrNull = (v?: string) => (v && v.trim() !== "" && !isNaN(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null);
      const updatePayload: Record<string, unknown> = {
        standby_equipos: standbyArr,
        updated_at: new Date().toISOString(),
        turno: cab.turno?.trim() || null,
        supervisor: cab.supervisor?.trim() || null,
        cargo: cab.cargo?.trim() || null,
        condicion_clima: cab.condicion_clima?.trim() || null,
        temp_sala: numOrNull(cab.temp_sala),
        hr_sala: numOrNull(cab.hr_sala),
        carga_it: numOrNull(cab.carga_it),
        pue: numOrNull(cab.pue),
        proxima_revision: cab.proxima_revision?.trim() || null,
      };
      if (finalizar) updatePayload.estado = "finalizado";
      await supabase.from("inspecciones").update(updatePayload as never).eq("id", id);
      if (finalizar) {
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

  // resumen — se excluyen equipos en Stand By
  const activePuntos = puntos.filter((p) => !standby.has(p.equipo_id));
  const activePuntoIds = new Set(activePuntos.map((p) => p.id));
  const all = Object.values(items).filter((i) => activePuntoIds.has(i.punto_id));
  const totalPuntos = activePuntos.length;
  const resumen = resumir(all, totalPuntos, standby);
  const { ok, alerta: al, falla: fa, na, disponibilidad: disp } = resumen;

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

      {/* Tabs por equipo (scroll horizontal) */}
      <div className="-mx-4 px-4 mb-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max pb-1">
          {equipos.map((eq) => {
            const eqPuntos = puntos.filter((p) => p.equipo_id === eq.id);
            if (eqPuntos.length === 0) return null;
            const eqItems = eqPuntos.map((p) => items[p.id]).filter(Boolean);
            const done = eqItems.length;
            const eqFail = eqItems.filter((i) => i?.semaforo === "rojo").length;
            const eqAlert = eqItems.filter((i) => i?.semaforo === "amarillo").length;
            const isActive = open === eq.id;
            const Icon = iconCat[eq.categoria] ?? Activity;
            const isSb = standby.has(eq.id);
            return (
              <button
                key={eq.id}
                onClick={() => setOpen(eq.id)}
                className={`shrink-0 flex items-center gap-2 px-3 h-10 rounded-xl border text-xs font-semibold transition ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_oklch(0.78_0.17_175_/_0.35)]"
                    : isSb
                    ? "bg-muted/40 border-muted-foreground/30 text-muted-foreground"
                    : "bg-surface-1 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span className="truncate max-w-[120px]">{eq.tag}</span>
                {isSb ? (
                  <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-warn/20 text-warn">STAND BY</span>
                ) : (
                  <>
                    <span className={`font-mono text-[10px] ${isActive ? "opacity-80" : "opacity-60"}`}>{done}/{eqPuntos.length}</span>
                    {eqFail > 0 && <span className="size-1.5 rounded-full bg-fail" />}
                    {eqAlert > 0 && !eqFail && <span className="size-1.5 rounded-full bg-warn" />}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido del equipo activo */}
      <div className="space-y-3 mb-6">
        {(() => {
          const eq = equipos.find((e) => e.id === open);
          if (!eq) return null;
          const eqPuntos = puntos.filter((p) => p.equipo_id === eq.id);
          const Icon = iconCat[eq.categoria] ?? Activity;
          const idx = equipos.findIndex((e) => e.id === eq.id);
          const prev = equipos[idx - 1];
          const next = equipos[idx + 1];
          const isSb = standby.has(eq.id);
          const showStandbyToggle = isAcCategoria(eq.categoria);
          return (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-4 flex items-center gap-3 border-b border-border/40">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/30 grid place-items-center">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{eq.categoria}</p>
                  <p className="font-semibold truncate">{eq.tag} <span className="text-muted-foreground font-normal text-xs">· {eq.marca}</span></p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{idx + 1}/{equipos.length}</span>
              </div>

              {showStandbyToggle && (
                <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between gap-3 bg-surface-1/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Power className={`size-4 ${isSb ? "text-warn" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">Equipo en Stand By</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Si está activo, no se registran parámetros y se indica en el informe.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={soloLectura}
                    onClick={() => toggleStandby(eq.id)}
                    role="switch"
                    aria-checked={isSb}
                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition ${isSb ? "bg-warn" : "bg-muted"}`}
                  >
                    <span className={`inline-block size-5 rounded-full bg-background shadow transition ${isSb ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              )}

              {isSb ? (
                <div className="p-6 text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warn/15 text-warn text-xs font-semibold uppercase tracking-wider">
                    <Power className="size-3.5" /> Stand By
                  </div>
                  <p className="text-sm text-muted-foreground">Este equipo está fuera de servicio en esta revisión. Sus parámetros no se registran y aparecerá como <span className="text-warn font-semibold">STAND BY</span> en el informe.</p>
                </div>
              ) : (
              <>
              <div className="px-4 pt-3 pb-1 border-b border-border/40">
                <PhotoCapture
                  mode="immediate"
                  parent={{ inspeccion_id: id }}
                  scope="equipo"
                  equipoRef={eq.id}
                  existing={evidencias.filter((e) => e.scope === "equipo" && e.equipo_ref === eq.id)}
                  onChange={reloadEvidencias}
                  label="Foto general del equipo"
                  compact
                />
              </div>

              <div className="p-4 space-y-3">
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

                      <div className="grid grid-cols-4 gap-1 mb-2">
                        {(["OK", "ALERTA", "FALLA", "NA"] as const).map((s) => (
                          <button
                            key={s}
                            disabled={soloLectura}
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

                      {p.tipo === "numerico" && (() => {
                        const count = cantidadValores(p);
                        const val = it?.valor ?? "";
                        const vres = validarNumerico(p, val);
                        if (count === 1) {
                          const err = vres.perValue[0];
                          return (
                            <div className="mb-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder={`Valor ${p.unidad ?? ""} (rango OK: ${p.min_ok}–${p.max_ok})`}
                                value={it?.valor ?? ""}
                                onChange={(e) => update(p, { valor: e.target.value })}
                                readOnly={soloLectura}
                                aria-invalid={!!err}
                                className={`w-full h-9 px-3 rounded-lg bg-background border text-sm font-mono focus:outline-none ${err ? "border-fail focus:border-fail" : "border-border focus:border-primary"}`}
                              />
                              {err && <p className="text-[10px] text-fail mt-1">{err}</p>}
                            </div>
                          );
                        }
                        const defaults = ["R", "S", "T"];
                        const labels = (p.etiquetas_valores && p.etiquetas_valores.length > 0)
                          ? p.etiquetas_valores
                          : defaults;
                        const arr = val.split("|");
                        while (arr.length < count) arr.push("");
                        return (
                          <div className="mb-2">
                            <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
                              {Array.from({ length: count }).map((_, i) => {
                                const err = vres.perValue[i];
                                return (
                                  <div key={i}>
                                    <p className="text-[10px] text-muted-foreground text-center mb-0.5 font-mono">{labels[i] ?? `V${i + 1}`}</p>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder={labels[i] ?? `V${i + 1}`}
                                      value={arr[i] ?? ""}
                                      onChange={(e) => {
                                        const next = [...arr];
                                        next[i] = e.target.value;
                                        update(p, { valor: next.slice(0, count).join("|") });
                                      }}
                                      readOnly={soloLectura}
                                      aria-invalid={!!err}
                                      className={`w-full h-9 px-2 rounded-lg bg-background border text-sm font-mono text-center focus:outline-none ${err ? "border-fail focus:border-fail" : "border-border focus:border-primary"}`}
                                    />
                                    {err && <p className="text-[10px] text-fail mt-0.5 leading-tight">{err}</p>}
                                  </div>
                                );
                              })}
                            </div>
                            {vres.global && <p className="text-[10px] text-fail mt-1">{vres.global}</p>}
                            <p className="text-[10px] text-muted-foreground mt-0.5">Se esperan {count} lecturas. Rango OK: {p.min_ok ?? "—"}–{p.max_ok ?? "—"}{p.unidad ? ` ${p.unidad}` : ""}.</p>
                          </div>
                        );
                      })()}


                      {p.tipo === "binario" && (() => {
                        // La respuesta correcta se define por parámetro (por defecto "No").
                        const esperada = (p.respuesta_esperada ?? "No").trim();
                        const grave = (p.severidad ?? "falla") === "falla";
                        return (
                          <div className="grid grid-cols-2 gap-1 mb-2">
                            {(["No", "Sí"] as const).map((v) => {
                              const conforme = v.toLowerCase() === esperada.toLowerCase();
                              const activo = it?.valor === v;
                              return (
                                <button
                                  key={v}
                                  disabled={soloLectura}
                                  onClick={() => update(p, { valor: v })}
                                  className={`py-2 text-xs font-semibold rounded-lg transition disabled:opacity-60 ${
                                    activo
                                      ? conforme
                                        ? "bg-ok text-ok-foreground"
                                        : grave
                                          ? "bg-fail text-fail-foreground"
                                          : "bg-warn text-warn-foreground"
                                      : "bg-background/40 text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {conforme ? "✓ " : "⚠ "}{v}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {p.tipo === "texto" && (
                        <input
                          type="text"
                          placeholder="Lectura / valor textual (ej: 230/231/229 50Hz)"
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
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary resize-none mb-2"
                      />
                      <PhotoCapture
                        mode="immediate"
                        parent={{ inspeccion_id: id }}
                        scope="parametro"
                        equipoRef={p.equipo_id}
                        paramKey={String(p.id)}
                        existing={evidencias.filter((e) => e.param_key === String(p.id))}
                        onChange={reloadEvidencias}
                        compact
                        label="Foto"
                      />
                    </div>
                  );
                })}
              </div>
              </>
              )}



              {/* Navegación entre equipos */}
              <div className="grid grid-cols-2 gap-2 p-3 border-t border-border/40">
                <button
                  onClick={() => prev && setOpen(prev.id)}
                  disabled={!prev}
                  className="h-11 rounded-xl bg-surface-1 border border-border text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                  {prev ? prev.tag : "Inicio"}
                </button>
                <button
                  onClick={() => next && setOpen(next.id)}
                  disabled={!next}
                  className="h-11 rounded-xl bg-primary/15 text-primary border border-primary/30 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  {next ? next.tag : "Final"}
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>



      {/* Exportar Word — informe técnico corporativo */}
      <div className={`mb-3 rounded-2xl p-3 border ${insp?.estado === "finalizado" ? "bg-primary/10 border-primary/40" : "bg-surface-1 border-border"}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold">Informe técnico Word</p>
            <p className="text-[11px] text-muted-foreground">Antecedentes, gráficas, tendencias, conclusiones y recomendaciones</p>
          </div>
          {insp?.estado === "finalizado" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-ok/15 text-ok uppercase tracking-wider font-semibold">Listo</span>}
        </div>
        <button
          onClick={descargarWord}
          disabled={exporting}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 text-sm shadow-[0_0_18px_oklch(0.78_0.17_175_/_0.35)] disabled:opacity-60"
        >
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          {exporting ? "Generando informe…" : "Descargar informe Word"}
        </button>
      </div>

      {/* Botones */}
      {soloLectura ? (
        <div className="sticky bottom-20 glass rounded-xl p-3 flex items-center gap-2 border border-border">
          <Lock className="size-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {insp?.estado === "finalizado"
              ? "Esta revisión está finalizada. Solo un administrador puede modificarla."
              : "Tu perfil es de consulta: puedes revisar y descargar el informe, pero no editar."}
          </p>
        </div>
      ) : (
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
      )}


    </AppShell>
  );
}

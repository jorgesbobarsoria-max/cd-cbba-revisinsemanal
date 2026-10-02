import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Semaforo } from "@/components/semaforo";
import { ChevronRight, ArrowLeft, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export type DetalleTipo = "disp" | "equipos" | "alertas" | "temp";
type Equipo = { id: string; tag: string; marca: string | null; modelo: string | null; categoria: string };
type Item = { equipo_id: string; punto_id: number; semaforo: string | null; valor: string | null; observaciones: string | null; accion_correctiva: string | null };
type Punto = { id: number; equipo_id: string; descripcion: string; tipo: string; unidad: string | null };
type Insp = { id: string; fecha: string; semana: number };

const isTemp = (p: Punto) => /temp/i.test(p.descripcion) && p.tipo === "numerico";
const num = (v: string | null) => parseFloat((v ?? "").replace(",", "."));

export function DashboardDetalle({
  tipo, onClose, equipos, items, puntos, insps, inspeccionId, standby,
}: {
  tipo: DetalleTipo | null; onClose: () => void;
  equipos: Equipo[]; items: Item[]; puntos: Punto[]; insps: Insp[];
  inspeccionId: string | null; standby: string[];
}) {
  const [equipoSel, setEquipoSel] = useState<string | null>(null);
  useEffect(() => { setEquipoSel(null); }, [tipo]);

  const resumen = useMemo(() => equipos.map((e) => {
    const its = items.filter((i) => i.equipo_id === e.id);
    const ok = its.filter((i) => i.semaforo === "verde").length;
    const alerta = its.filter((i) => i.semaforo === "amarillo").length;
    const falla = its.filter((i) => i.semaforo === "rojo").length;
    const ev = ok + alerta + falla;
    const sb = standby.includes(e.id);
    const estado = sb ? "standby" : its.length === 0 ? "sin" : falla ? "rojo" : alerta ? "amarillo" : "verde";
    return { e, its, ok, alerta, falla, disp: ev ? Math.round((ok / ev) * 100) : null, estado };
  }), [equipos, items, standby]);

  const titulos: Record<DetalleTipo, [string, string]> = {
    disp: ["Disponibilidad por equipo", "Parámetros OK frente al total evaluado en la revisión seleccionada."],
    equipos: ["Estado de equipos", "Toca un equipo con alerta para ver los parámetros registrados."],
    alertas: ["Alertas activas", "Alertas registradas con los datos del equipo."],
    temp: ["Temperatura por equipo", "Selecciona un equipo para ver su tendencia."],
  };

  return (
    <Dialog open={!!tipo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-lg">
        {tipo && (
          <>
            <DialogHeader>
              <DialogTitle>{titulos[tipo][0]}</DialogTitle>
              <DialogDescription>{titulos[tipo][1]}</DialogDescription>
            </DialogHeader>

            {equipoSel && tipo !== "temp" ? (
              <DetalleEquipo r={resumen.find((r) => r.e.id === equipoSel)!} puntos={puntos}
                inspeccionId={inspeccionId} onBack={() => setEquipoSel(null)} />
            ) : tipo === "disp" ? (
              <ul className="space-y-2">
                {resumen.map((r) => (
                  <li key={r.e.id}>
                    <button onClick={() => setEquipoSel(r.e.id)} className="w-full glass rounded-xl p-3 text-left hover:border-primary/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate">{r.e.tag}</span>
                        <span className="text-sm font-mono font-bold">
                          {r.estado === "standby" ? "STAND BY" : r.disp != null ? `${r.disp}%` : "--"}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${r.falla ? "bg-fail" : r.alerta ? "bg-warn" : "bg-ok"}`} style={{ width: `${r.disp ?? 0}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{r.e.categoria} · {r.ok} OK · {r.alerta} alerta · {r.falla} falla</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : tipo === "equipos" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([["OK", resumen.filter((r) => r.estado === "verde")], ["Con falla / otro estado", resumen.filter((r) => r.estado !== "verde")]] as const).map(([t, lista]) => (
                  <div key={t}>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">{t} ({lista.length})</p>
                    <ul className="space-y-1.5">
                      {lista.map((r) => (
                        <li key={r.e.id}>
                          <button onClick={() => setEquipoSel(r.e.id)} className="w-full glass rounded-lg p-2 flex items-center justify-between gap-2 text-left hover:border-primary/40">
                            <span className="text-xs font-semibold truncate">{r.e.tag}</span>
                            {r.estado === "standby" ? <span className="text-[10px] text-muted-foreground">STAND BY</span>
                              : r.estado === "sin" ? <span className="text-[10px] text-muted-foreground">Sin registro</span>
                              : <Semaforo estado={r.estado} />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : tipo === "alertas" ? (
              <ListaAlertas resumen={resumen} puntos={puntos} inspeccionId={inspeccionId} />
            ) : (
              <TempTendencia equipos={equipos} puntos={puntos} insps={insps} equipoSel={equipoSel} setEquipoSel={setEquipoSel} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AbrirRevision({ id }: { id: string | null }) {
  if (!id) return null;
  return (
    <Link to="/inspeccion/$id" params={{ id }} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
      <ExternalLink className="size-3" /> Abrir en la revisión
    </Link>
  );
}

function DetalleEquipo({ r, puntos, inspeccionId, onBack }: {
  r: { e: Equipo; its: Item[] }; puntos: Punto[]; inspeccionId: string | null; onBack: () => void;
}) {
  const orden = { rojo: 0, amarillo: 1, verde: 2 } as Record<string, number>;
  const its = [...r.its].sort((a, b) => (orden[a.semaforo ?? ""] ?? 3) - (orden[b.semaforo ?? ""] ?? 3));
  return (
    <div className="space-y-2">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="size-3.5" /> Volver</button>
      <div className="glass rounded-xl p-3">
        <p className="text-sm font-bold">{r.e.tag}</p>
        <p className="text-[11px] text-muted-foreground">{r.e.categoria} · {[r.e.marca, r.e.modelo].filter(Boolean).join(" ") || "—"}</p>
        <div className="mt-1"><AbrirRevision id={inspeccionId} /></div>
      </div>
      {its.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin parámetros registrados.</p>}
      <ul className="space-y-1.5">
        {its.map((i) => {
          const p = puntos.find((x) => x.id === i.punto_id);
          return (
            <li key={i.punto_id} className="glass rounded-lg p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs">{p?.descripcion ?? `#${i.punto_id}`}</p>
                <Semaforo estado={i.semaforo} />
              </div>
              {i.valor && <p className="text-[11px] font-mono mt-0.5">{i.valor} {p?.unidad ?? ""}</p>}
              {i.observaciones && <p className="text-[11px] text-muted-foreground mt-0.5">Obs: {i.observaciones}</p>}
              {i.accion_correctiva && <p className="text-[11px] text-muted-foreground">Acción: {i.accion_correctiva}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ListaAlertas({ resumen, puntos, inspeccionId }: {
  resumen: { e: Equipo; its: Item[] }[]; puntos: Punto[]; inspeccionId: string | null;
}) {
  const alertas = resumen.flatMap((r) => r.its.filter((i) => i.semaforo === "amarillo" || i.semaforo === "rojo").map((i) => ({ e: r.e, i })));
  if (!alertas.length) return <p className="text-center py-6 text-xs text-muted-foreground">Sin alertas activas.</p>;
  return (
    <ul className="space-y-2">
      {alertas.map(({ e, i }) => {
        const p = puntos.find((x) => x.id === i.punto_id);
        return (
          <li key={`${e.id}-${i.punto_id}`} className={`glass rounded-xl p-3 border-l-4 ${i.semaforo === "rojo" ? "border-l-fail" : "border-l-warn"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold truncate">{e.tag}</p>
              <Semaforo estado={i.semaforo} />
            </div>
            <p className="text-[11px] text-muted-foreground">{e.categoria} · {[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}</p>
            <p className="text-xs mt-1.5 font-medium">{p?.descripcion ?? `#${i.punto_id}`}</p>
            {i.valor && <p className="text-[11px] font-mono">Valor: {i.valor} {p?.unidad ?? ""}</p>}
            {i.observaciones && <p className="text-[11px] text-muted-foreground">Obs: {i.observaciones}</p>}
            {i.accion_correctiva && <p className="text-[11px] text-muted-foreground">Acción: {i.accion_correctiva}</p>}
            <div className="mt-1"><AbrirRevision id={inspeccionId} /></div>
          </li>
        );
      })}
    </ul>
  );
}

function TempTendencia({ equipos, puntos, insps, equipoSel, setEquipoSel }: {
  equipos: Equipo[]; puntos: Punto[]; insps: Insp[]; equipoSel: string | null; setEquipoSel: (id: string | null) => void;
}) {
  const conTemp = equipos.filter((e) => puntos.some((p) => p.equipo_id === e.id && isTemp(p)));
  const [data, setData] = useState<{ semana: string; temp: number | null }[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!equipoSel) return;
    const pts = puntos.filter((p) => p.equipo_id === equipoSel && isTemp(p)).map((p) => p.id);
    if (!pts.length || !insps.length) { setData([]); return; }
    setCargando(true);
    (async () => {
      const { data: rows } = await supabase.from("inspeccion_items")
        .select("inspeccion_id,valor").eq("equipo_id", equipoSel).in("punto_id", pts)
        .in("inspeccion_id", insps.map((i) => i.id));
      const serie = [...insps].reverse().map((i) => {
        const vals = (rows ?? []).filter((r) => r.inspeccion_id === i.id).map((r) => num(r.valor)).filter((n) => !isNaN(n));
        return { semana: `W${i.semana}`, temp: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null };
      }).filter((d) => d.temp != null);
      setData(serie);
      setCargando(false);
    })();
  }, [equipoSel, puntos, insps]);

  if (!equipoSel) {
    if (!conTemp.length) return <p className="text-center py-6 text-xs text-muted-foreground">Ningún equipo tiene parámetros de temperatura.</p>;
    return (
      <ul className="space-y-1.5">
        {conTemp.map((e) => (
          <li key={e.id}>
            <button onClick={() => setEquipoSel(e.id)} className="w-full glass rounded-lg p-2.5 flex items-center justify-between text-left hover:border-primary/40">
              <span><span className="text-sm font-semibold">{e.tag}</span> <span className="text-[11px] text-muted-foreground">{e.categoria}</span></span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    );
  }
  const eq = equipos.find((e) => e.id === equipoSel);
  return (
    <div className="space-y-2">
      <button onClick={() => setEquipoSel(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="size-3.5" /> Volver</button>
      <p className="text-sm font-bold">{eq?.tag} <span className="text-[11px] font-normal text-muted-foreground">tendencia (°C)</span></p>
      {cargando ? <p className="text-xs text-muted-foreground py-6 text-center">Cargando…</p>
        : data.length === 0 ? <p className="text-xs text-muted-foreground py-6 text-center">Sin registros de temperatura.</p>
        : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
              <XAxis dataKey="semana" tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
              <YAxis tick={{ fill: "oklch(0.7 0.02 250)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.02 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={27} stroke="oklch(0.68 0.22 25)" strokeDasharray="4 4" />
              <ReferenceLine y={18} stroke="oklch(0.78 0.17 220)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="temp" name="Temp" stroke="oklch(0.78 0.17 175)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
    </div>
  );
}

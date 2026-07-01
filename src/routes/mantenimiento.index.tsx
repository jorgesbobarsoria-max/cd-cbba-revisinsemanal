import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wrench, ChevronRight, Server, SlidersHorizontal, FileDown, Loader2, CheckSquare, Square } from "lucide-react";
import { PLANTILLAS } from "@/lib/mantenimiento-plantillas";
import { generarInformeMantenimientoWord, type PlantillaInforme } from "@/lib/reporte-mantenimiento.functions";
import { PlantillaInformeSelector } from "@/components/plantilla-informe-selector";
import { toast } from "sonner";


export const Route = createFileRoute("/mantenimiento/")({
  component: MantenimientoListPage,
});

type Row = {
  id: string; tipo: string; fecha: string; tecnico: string | null;
  equipo_id: string | null; estado: string;
  equipo_externo: { modelo?: string; tag?: string } | null;
};

function MantenimientoListPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [selMode, setSelMode] = useState(false);
  const [dl, setDl] = useState(false);
  const [plantillaInforme, setPlantillaInforme] = useState<PlantillaInforme>("por-tipo");
  const generar = useServerFn(generarInformeMantenimientoWord);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mantenimientos")
        .select("id,tipo,fecha,tecnico,equipo_id,estado,equipo_externo")
        .order("fecha", { ascending: false }).limit(100);
      setRows((data ?? []) as Row[]);
      setBusy(false);
    })();
  }, []);

  function toggle(id: string) {
    setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function descargar() {
    if (!sel.size) { toast.error("Selecciona al menos un mantenimiento"); return; }
    setDl(true);
    try {
      const { base64, filename } = await generar({ data: { ids: Array.from(sel), plantilla: plantillaInforme } });
      const bin = atob(base64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Informe generado (${sel.size} equipo${sel.size > 1 ? "s" : ""})`);
      setSelMode(false); setSel(new Set());
    } catch (e: any) { toast.error(e.message ?? "Error al generar"); }
    setDl(false);
  }

  return (
    <AppShell title="Mantenimiento Preventivo">
      <div className="mb-5">
        <h2 className="text-xl font-bold flex items-center gap-2"><Wrench className="size-5 text-primary" /> Mantenimiento preventivo</h2>
        <p className="text-xs text-muted-foreground mt-1">Formularios oficiales por tipo de equipo · Climatización · UPS · ATS · Generador · Supresor de incendios · MDC</p>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-2">
        <Link to="/mantenimiento/equipos-externos" className="glass rounded-xl p-3 hover:bg-secondary/40 flex items-start gap-2">
          <Server className="size-5 text-primary mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Equipos no registrados</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Crear · editar · eliminar</p>
          </div>
        </Link>
        <Link to="/mantenimiento/parametros" className="glass rounded-xl p-3 hover:bg-secondary/40 flex items-start gap-2">
          <SlidersHorizontal className="size-5 text-primary mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Parámetros del formulario</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Añadir · modificar · borrar</p>
          </div>
        </Link>
      </section>


      <section className="mb-6">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">Nuevo mantenimiento</h3>
        <div className="grid grid-cols-2 gap-2">
          {PLANTILLAS.map(p => (
            <Link
              key={p.id}
              to="/mantenimiento/nuevo/$tipo"
              params={{ tipo: p.id }}
              className="glass rounded-xl p-3 hover:bg-secondary/40 transition-colors flex items-start gap-2"
            >
              <span className="text-2xl leading-none">{p.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{p.nombre.split(" /")[0]}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.secciones.length} secciones</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Historial</h3>
          {rows.length > 0 && (
            <button onClick={() => { setSelMode(m => !m); setSel(new Set()); }} className="text-[11px] text-primary hover:underline">
              {selMode ? "Cancelar" : "Seleccionar para informe"}
            </button>
          )}
        </div>

        {selMode && (
          <div className="glass rounded-xl p-3 mb-2 sticky top-0 z-10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs">
                <p className="font-semibold">{sel.size} seleccionado(s)</p>
                <p className="text-[10px] text-muted-foreground">Informe Word consolidado con tendencias y recomendaciones</p>
              </div>
              <Button size="sm" disabled={!sel.size || dl} onClick={descargar}>
                {dl ? <><Loader2 className="size-4 animate-spin" /> Generando…</> : <><FileDown className="size-4" /> Descargar</>}
              </Button>
            </div>
            <PlantillaInformeSelector value={plantillaInforme} onChange={setPlantillaInforme} />
          </div>
        )}

        {busy ? <p className="text-sm text-muted-foreground">Cargando…</p> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin registros aún. Crea tu primer mantenimiento.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => {
              const p = PLANTILLAS.find(x => x.id === r.tipo);
              const target = r.equipo_id ?? r.equipo_externo?.tag ?? r.equipo_externo?.modelo ?? "Sin equipo";
              const checked = sel.has(r.id);
              const content = (
                <>
                  {selMode ? (
                    checked ? <CheckSquare className="size-5 text-primary shrink-0" /> : <Square className="size-5 text-muted-foreground shrink-0" />
                  ) : (
                    <span className="text-xl">{p?.icon ?? "🛠️"}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p?.nombre ?? r.tipo} · <span className="text-muted-foreground font-normal">{target}</span></p>
                    <p className="text-[11px] text-muted-foreground">{r.fecha} · {r.tecnico ?? "—"} · <span className={r.estado === "finalizado" ? "text-ok" : "text-warn"}>{r.estado}</span></p>
                  </div>
                  {!selMode && <ChevronRight className="size-4 text-muted-foreground" />}
                </>
              );
              return selMode ? (
                <button key={r.id} type="button" onClick={() => toggle(r.id)}
                  className={`w-full glass rounded-xl p-3 flex items-center gap-3 text-left ${checked ? "ring-1 ring-primary" : "hover:bg-secondary/40"}`}>
                  {content}
                </button>
              ) : (
                <Link key={r.id} to="/mantenimiento/$id" params={{ id: r.id }} className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-secondary/40">
                  {content}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

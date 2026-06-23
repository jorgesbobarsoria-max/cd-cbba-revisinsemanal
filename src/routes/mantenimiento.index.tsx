import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Wrench, ChevronRight, Server, SlidersHorizontal } from "lucide-react";
import { PLANTILLAS } from "@/lib/mantenimiento-plantillas";


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
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">Historial</h3>
        {busy ? <p className="text-sm text-muted-foreground">Cargando…</p> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin registros aún. Crea tu primer mantenimiento.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => {
              const p = PLANTILLAS.find(x => x.id === r.tipo);
              const target = r.equipo_id ?? r.equipo_externo?.tag ?? r.equipo_externo?.modelo ?? "Sin equipo";
              return (
                <Link key={r.id} to="/mantenimiento/$id" params={{ id: r.id }} className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-secondary/40">
                  <span className="text-xl">{p?.icon ?? "🛠️"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p?.nombre ?? r.tipo} · <span className="text-muted-foreground font-normal">{target}</span></p>
                    <p className="text-[11px] text-muted-foreground">{r.fecha} · {r.tecnico ?? "—"} · <span className={r.estado === "finalizado" ? "text-ok" : "text-warn"}>{r.estado}</span></p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

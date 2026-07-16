import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Settings2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { friendlyDbError } from "@/lib/friendly-errors";

export const Route = createFileRoute("/equipos")({
  component: EquiposPage,
});

type Equipo = {
  id: string; categoria: string; tag: string; marca: string | null; modelo: string | null;
  capacidad: string | null; ubicacion: string | null; criticidad: string | null;
  redundancia: string | null; estado: string | null; orden: number;
  fecha_instalacion: string | null; observaciones: string | null;
  datos_adicionales?: Record<string, string> | null;
};

type Punto = {
  id: number; equipo_id: string; numero: number; descripcion: string;
  tipo: string; unidad: string | null;
  min_ok: number | null; max_ok: number | null;
  min_alerta: number | null; max_alerta: number | null;
  valores_count?: number | null; etiquetas_valores?: string[] | null;
};

const CATEGORIAS = ["Aire de Precisión", "UPS", "ATS", "Grupo Generador", "Sup. Incendios", "Sensores Sala"];
const CRITICIDADES = ["Crítica", "Alta", "Media", "Baja"];
const TIPOS = ["estado", "numerico", "texto", "binario"];

function EquiposPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [eq, setEq] = useState<Equipo[]>([]);
  const [editing, setEditing] = useState<Partial<Equipo> | null>(null);
  const [paramsOf, setParamsOf] = useState<Equipo | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  async function load() {
    const { data } = await supabase.from("equipos").select("*").order("orden");
    setEq((data ?? []) as Equipo[]);
  }
  useEffect(() => { load(); }, []);

  async function saveEquipo() {
    if (!editing?.id || !editing?.tag || !editing?.categoria) {
      toast.error("ID, TAG y Categoría son obligatorios");
      return;
    }
    const payload = {
      id: editing.id, categoria: editing.categoria, tag: editing.tag,
      marca: editing.marca ?? null, modelo: editing.modelo ?? null,
      capacidad: editing.capacidad ?? null, ubicacion: editing.ubicacion ?? null,
      criticidad: editing.criticidad ?? null, redundancia: editing.redundancia ?? null,
      estado: editing.estado ?? "Operativo", orden: editing.orden ?? eq.length + 1,
      fecha_instalacion: editing.fecha_instalacion || null,
      observaciones: editing.observaciones ?? null,
    };
    const { error } = await supabase.from("equipos").upsert(payload);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success("Equipo guardado");
    setEditing(null);
    load();
  }

  async function delEquipo(id: string) {
    if (!confirm(`¿Eliminar equipo ${id}? También se borrarán sus puntos de inspección.`)) return;
    await supabase.from("puntos_inspeccion").delete().eq("equipo_id", id);
    const { error } = await supabase.from("equipos").delete().eq("id", id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success("Equipo eliminado");
    load();
  }

  if (paramsOf) return <ParamsView equipo={paramsOf} onBack={() => setParamsOf(null)} />;

  const groups = eq.reduce<Record<string, Equipo[]>>((acc, e) => { (acc[e.categoria] ||= []).push(e); return acc; }, {});

  return (
    <AppShell title="Gestión de Equipos">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Catálogo</h2>
          <p className="text-xs text-muted-foreground">{eq.length} equipos · toca para editar parámetros</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ orden: eq.length + 1, estado: "Operativo" })}>
          <Plus className="size-4" /> Nuevo
        </Button>
      </div>

      {Object.entries(groups).map(([cat, items]) => (
        <section key={cat} className="mb-5">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">{cat}</h3>
          <div className="space-y-2">
            {items.map((e) => (
              <div key={e.id} className="glass rounded-xl p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{e.tag} <span className="text-muted-foreground font-mono text-xs">· {e.id}</span></p>
                    <p className="text-xs text-muted-foreground truncate">{e.marca} {e.modelo} · {e.capacidad}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.ubicacion}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold whitespace-nowrap ${
                    e.criticidad === "Crítica" ? "bg-fail/15 text-fail" : e.criticidad === "Alta" ? "bg-warn/15 text-warn" : "bg-muted/30 text-muted-foreground"
                  }`}>{e.criticidad}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setParamsOf(e)}>
                    <Settings2 className="size-3.5" /> Parámetros
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => delEquipo(e.id)} className="text-fail hover:text-fail">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.tag ? "Editar equipo" : "Nuevo equipo"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="ID (código único)"><Input value={editing.id ?? ""} onChange={(e) => setEditing({ ...editing, id: e.target.value })} placeholder="ACU-01" disabled={!!eq.find(x => x.id === editing.id)} /></Field>
              <Field label="TAG"><Input value={editing.tag ?? ""} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} placeholder="Aire Precisión Sala 1" /></Field>
              <Field label="Categoría">
                <Select value={editing.categoria ?? ""} onValueChange={(v) => setEditing({ ...editing, categoria: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Marca"><Input value={editing.marca ?? ""} onChange={(e) => setEditing({ ...editing, marca: e.target.value })} /></Field>
                <Field label="Modelo"><Input value={editing.modelo ?? ""} onChange={(e) => setEditing({ ...editing, modelo: e.target.value })} /></Field>
              </div>
              <Field label="Capacidad"><Input value={editing.capacidad ?? ""} onChange={(e) => setEditing({ ...editing, capacidad: e.target.value })} /></Field>
              <Field label="Ubicación"><Input value={editing.ubicacion ?? ""} onChange={(e) => setEditing({ ...editing, ubicacion: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Criticidad">
                  <Select value={editing.criticidad ?? ""} onValueChange={(v) => setEditing({ ...editing, criticidad: v })}>
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>{CRITICIDADES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Redundancia"><Input value={editing.redundancia ?? ""} onChange={(e) => setEditing({ ...editing, redundancia: e.target.value })} placeholder="N+1" /></Field>
              </div>
              <Field label="Observaciones"><Textarea value={editing.observaciones ?? ""} onChange={(e) => setEditing({ ...editing, observaciones: e.target.value })} rows={2} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEquipo}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ParamsView({ equipo, onBack }: { equipo: Equipo; onBack: () => void }) {
  const [pts, setPts] = useState<Punto[]>([]);
  const [editing, setEditing] = useState<Partial<Punto> | null>(null);

  async function load() {
    const { data } = await supabase.from("puntos_inspeccion").select("*").eq("equipo_id", equipo.id).order("numero");
    setPts((data ?? []) as Punto[]);
  }
  useEffect(() => { load(); }, [equipo.id]);

  async function save() {
    if (!editing?.descripcion || !editing?.tipo) { toast.error("Descripción y tipo son obligatorios"); return; }
    const payload = {
      equipo_id: equipo.id,
      numero: editing.numero ?? pts.length + 1,
      descripcion: editing.descripcion,
      tipo: editing.tipo,
      unidad: editing.unidad ?? null,
      min_ok: numOrNull(editing.min_ok), max_ok: numOrNull(editing.max_ok),
      min_alerta: numOrNull(editing.min_alerta), max_alerta: numOrNull(editing.max_alerta),
    };
    const q = editing.id
      ? supabase.from("puntos_inspeccion").update(payload).eq("id", editing.id)
      : supabase.from("puntos_inspeccion").insert(payload);
    const { error } = await q;
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success("Parámetro guardado");
    setEditing(null);
    load();
  }

  async function del(id: number) {
    if (!confirm("¿Eliminar este parámetro?")) return;
    const { error } = await supabase.from("puntos_inspeccion").delete().eq("id", id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success("Eliminado");
    load();
  }

  return (
    <AppShell title="Parámetros">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Volver
        </button>
        <Button size="sm" onClick={() => setEditing({ numero: pts.length + 1, tipo: "numerico" })}>
          <Plus className="size-4" /> Nuevo
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{equipo.categoria}</p>
        <h2 className="text-lg font-bold">{equipo.tag}</h2>
        <p className="text-xs text-muted-foreground">{equipo.id} · {pts.length} parámetros</p>
      </div>

      <div className="space-y-2">
        {pts.map((p) => (
          <div key={p.id} className="glass rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium"><span className="text-muted-foreground font-mono text-xs mr-1">#{p.numero}</span>{p.descripcion}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  <span className="uppercase">{p.tipo}</span>
                  {p.unidad && ` · ${p.unidad}`}
                  {p.tipo === "numerico" && (
                    <> · OK [{p.min_ok ?? "—"}, {p.max_ok ?? "—"}] · Alerta [{p.min_alerta ?? "—"}, {p.max_alerta ?? "—"}]</>
                  )}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="size-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => del(p.id)} className="text-fail hover:text-fail"><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
        {pts.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sin parámetros. Crea el primero.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar parámetro" : "Nuevo parámetro"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Field label="Nº"><Input type="number" value={editing.numero ?? ""} onChange={(e) => setEditing({ ...editing, numero: +e.target.value })} /></Field>
                <div className="col-span-2">
                  <Field label="Tipo">
                    <Select value={editing.tipo ?? ""} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
              <Field label="Descripción"><Textarea value={editing.descripcion ?? ""} onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })} rows={2} /></Field>
              <Field label="Unidad (°C, %, V, A...)"><Input value={editing.unidad ?? ""} onChange={(e) => setEditing({ ...editing, unidad: e.target.value })} /></Field>
              {editing.tipo === "numerico" && (
                <>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">Rangos de alerta</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Mín OK"><Input type="number" step="any" value={editing.min_ok ?? ""} onChange={(e) => setEditing({ ...editing, min_ok: e.target.value === "" ? null : +e.target.value })} /></Field>
                    <Field label="Máx OK"><Input type="number" step="any" value={editing.max_ok ?? ""} onChange={(e) => setEditing({ ...editing, max_ok: e.target.value === "" ? null : +e.target.value })} /></Field>
                    <Field label="Mín Alerta"><Input type="number" step="any" value={editing.min_alerta ?? ""} onChange={(e) => setEditing({ ...editing, min_alerta: e.target.value === "" ? null : +e.target.value })} /></Field>
                    <Field label="Máx Alerta"><Input type="number" step="any" value={editing.max_alerta ?? ""} onChange={(e) => setEditing({ ...editing, max_alerta: e.target.value === "" ? null : +e.target.value })} /></Field>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Fuera del rango Alerta → FALLA (rojo). Dentro de OK → verde.</p>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

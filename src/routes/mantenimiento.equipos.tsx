import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, Plus, Pencil, Trash2, Server } from "lucide-react";
import { toast } from "sonner";
import { PLANTILLAS } from "@/lib/mantenimiento-plantillas";

export const Route = createFileRoute("/mantenimiento/equipos")({
  component: EquiposExternosPage,
});

type Row = {
  id: string; tag: string; tipo: string; marca: string | null; modelo: string | null;
  serie: string | null; capacidad: string | null; ubicacion: string | null; notas: string | null;
};

const EMPTY = { tag: "", tipo: "ups", marca: "", modelo: "", serie: "", capacidad: "", ubicacion: "", notas: "" };

function EquiposExternosPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [filtroTipo, setFiltroTipo] = useState<string>("all");

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  async function load() {
    setBusy(true);
    const { data } = await supabase.from("equipos_externos").select("*").order("tag");
    setRows((data ?? []) as Row[]);
    setBusy(false);
  }
  useEffect(() => { load(); }, []);

  function openNuevo() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(r: Row) {
    setEditing(r);
    setForm({
      tag: r.tag, tipo: r.tipo, marca: r.marca ?? "", modelo: r.modelo ?? "",
      serie: r.serie ?? "", capacidad: r.capacidad ?? "", ubicacion: r.ubicacion ?? "", notas: r.notas ?? "",
    });
    setOpen(true);
  }

  async function guardar() {
    if (!form.tag.trim()) { toast.error("TAG es obligatorio"); return; }
    const payload = { ...form, created_by: user?.id ?? null };
    if (editing) {
      const { error } = await supabase.from("equipos_externos").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Equipo actualizado");
    } else {
      const { error } = await supabase.from("equipos_externos").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Equipo agregado");
    }
    setOpen(false); load();
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este equipo?")) return;
    const { error } = await supabase.from("equipos_externos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado"); load();
  }

  const filtered = filtroTipo === "all" ? rows : rows.filter(r => r.tipo === filtroTipo);

  return (
    <AppShell title="Equipos no registrados">
      <div className="flex items-center justify-between mb-3">
        <Link to="/mantenimiento" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Volver
        </Link>
        <Button size="sm" onClick={openNuevo}><Plus className="size-4" /> Nuevo</Button>
      </div>

      <div className="mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><Server className="size-5 text-primary" /> Equipos no registrados</h2>
        <p className="text-xs text-muted-foreground">Catálogo manual para mantenimiento de equipos fuera del inventario principal.</p>
      </div>

      <div className="mb-3">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {PLANTILLAS.map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {busy ? <p className="text-sm text-muted-foreground">Cargando…</p> : filtered.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center text-sm text-muted-foreground">
          Sin equipos. Pulsa "Nuevo" para añadir el primero.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const p = PLANTILLAS.find(x => x.id === r.tipo);
            return (
              <div key={r.id} className="glass rounded-xl p-3 flex items-center gap-2">
                <span className="text-xl">{p?.icon ?? "🛠️"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.tag} <span className="text-muted-foreground text-xs font-normal">· {p?.nombre.split(" /")[0] ?? r.tipo}</span></p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[r.marca, r.modelo, r.ubicacion].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <button onClick={() => openEdit(r)} className="size-8 grid place-items-center rounded-lg hover:bg-secondary/40"><Pencil className="size-4" /></button>
                <button onClick={() => borrar(r.id)} className="size-8 grid place-items-center rounded-lg hover:bg-fail/10 text-fail"><Trash2 className="size-4" /></button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar equipo" : "Nuevo equipo no registrado"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Field label="TAG *"><Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="UPS-EXT-01" /></Field>
            <Field label="Tipo">
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PLANTILLAS.map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.nombre.split(" /")[0]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Marca"><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Field>
            <Field label="Modelo"><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Field>
            <Field label="Nº Serie"><Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} /></Field>
            <Field label="Capacidad"><Input value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} placeholder="10 kVA" /></Field>
            <div className="col-span-2"><Field label="Ubicación"><Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Notas"><Textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>{editing ? "Guardar cambios" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px]">{label}</Label>{children}</div>;
}

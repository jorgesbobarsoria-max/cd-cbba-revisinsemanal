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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, Plus, Pencil, Trash2, Server } from "lucide-react";
import { toast } from "sonner";
import { PLANTILLAS } from "@/lib/mantenimiento-plantillas";

export const Route = createFileRoute("/mantenimiento/equipos-externos")({
  component: EquiposExternosPage,
});

type Externo = {
  id: string; tag: string; tipo: string; marca: string | null; modelo: string | null;
  serie: string | null; capacidad: string | null; ubicacion: string | null; notas: string | null;
};

const EMPTY = { tag: "", tipo: PLANTILLAS[0].id, marca: "", modelo: "", serie: "", capacidad: "", ubicacion: "", notas: "" };

function EquiposExternosPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Externo[]>([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Externo | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  async function load() {
    setBusy(true);
    const { data } = await supabase.from("equipos_externos").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Externo[]);
    setBusy(false);
  }
  useEffect(() => { load(); }, []);

  function startNew() { setEditing(null); setForm({ ...EMPTY }); setOpen(true); }
  function startEdit(r: Externo) {
    setEditing(r);
    setForm({
      tag: r.tag, tipo: r.tipo, marca: r.marca ?? "", modelo: r.modelo ?? "",
      serie: r.serie ?? "", capacidad: r.capacidad ?? "", ubicacion: r.ubicacion ?? "", notas: r.notas ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.tag.trim()) { toast.error("El TAG es obligatorio"); return; }
    const payload = {
      tag: form.tag.trim(), tipo: form.tipo,
      marca: form.marca || null, modelo: form.modelo || null, serie: form.serie || null,
      capacidad: form.capacidad || null, ubicacion: form.ubicacion || null, notas: form.notas || null,
    };
    const q = editing
      ? supabase.from("equipos_externos").update(payload).eq("id", editing.id)
      : supabase.from("equipos_externos").insert({ ...payload, created_by: user?.id ?? null });
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Equipo actualizado" : "Equipo creado");
    setOpen(false); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("equipos_externos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Equipo eliminado"); load();
  }

  const tipoNombre = (t: string) => PLANTILLAS.find(p => p.id === t)?.nombre ?? t;
  const tipoIcon = (t: string) => PLANTILLAS.find(p => p.id === t)?.icon ?? "🛠️";

  return (
    <AppShell title="Equipos no registrados">
      <div className="flex items-center justify-between mb-4">
        <Link to="/mantenimiento" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Volver
        </Link>
        <Button size="sm" onClick={startNew}><Plus className="size-4" /> Nuevo</Button>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><Server className="size-5 text-primary" /> Equipos no registrados</h2>
        <p className="text-xs text-muted-foreground mt-1">Catálogo independiente para mantenimientos preventivos. Crea, edita o elimina equipos que no estén en la planilla de revisión semanal.</p>
      </div>

      {busy ? <p className="text-sm text-muted-foreground">Cargando…</p> : rows.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">No hay equipos externos aún.</p>
          <Button size="sm" onClick={startNew} className="mt-3"><Plus className="size-4" /> Crear primer equipo</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">{tipoIcon(r.tipo)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{r.tag} <span className="text-muted-foreground font-normal">· {r.modelo ?? r.marca ?? "—"}</span></p>
                <p className="text-[11px] text-muted-foreground truncate">{tipoNombre(r.tipo)} · {r.ubicacion ?? "Sin ubicación"} {r.serie && `· S/N ${r.serie}`}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => startEdit(r)} aria-label="Editar"><Pencil className="size-4" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Eliminar"><Trash2 className="size-4 text-fail" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar equipo</AlertDialogTitle>
                    <AlertDialogDescription>¿Eliminar "{r.tag}"? Los mantenimientos existentes conservarán los datos guardados.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(r.id)}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar equipo" : "Nuevo equipo no registrado"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="TAG *"><Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="UPS-EXT-01" /></Field>
              <Field label="Tipo">
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLANTILLAS.map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Marca"><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Field>
              <Field label="Modelo"><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Field>
              <Field label="Nº Serie"><Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} /></Field>
              <Field label="Capacidad"><Input value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} /></Field>
            </div>
            <Field label="Ubicación"><Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></Field>
            <Field label="Notas"><Textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px]">{label}</Label>{children}</div>;
}

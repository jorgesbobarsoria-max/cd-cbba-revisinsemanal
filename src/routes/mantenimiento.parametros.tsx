import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, Plus, Pencil, Trash2, Sliders, Lock } from "lucide-react";
import { toast } from "sonner";
import { PLANTILLAS, getPlantilla } from "@/lib/mantenimiento-plantillas";

export const Route = createFileRoute("/mantenimiento/parametros")({
  component: ParametrosPage,
});

type Param = {
  id: string; tipo: string; seccion: string; clave: string; label: string;
  tipo_dato: string; unidad: string | null; opciones: string[] | null; orden: number;
};

const EMPTY = { seccion: "", clave: "", label: "", tipo_dato: "binario", unidad: "", opciones: "" };

function ParametrosPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [tipo, setTipo] = useState<string>("clima");
  const [rows, setRows] = useState<Param[]>([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Param | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  async function load() {
    setBusy(true);
    const { data } = await supabase.from("plantilla_parametros").select("*").eq("tipo", tipo).order("orden");
    setRows((data ?? []) as Param[]);
    setBusy(false);
  }
  useEffect(() => { load(); }, [tipo]);

  const plantilla = useMemo(() => getPlantilla(tipo), [tipo]);
  const seccionesBase = plantilla?.secciones.map(s => s.titulo) ?? [];
  const todasSecciones = Array.from(new Set([...seccionesBase, ...rows.map(r => r.seccion)]));

  function openNuevo() { setEditing(null); setForm({ ...EMPTY, seccion: seccionesBase[0] ?? "Personalizados" }); setOpen(true); }
  function openEdit(p: Param) {
    setEditing(p);
    setForm({
      seccion: p.seccion, clave: p.clave, label: p.label,
      tipo_dato: p.tipo_dato, unidad: p.unidad ?? "",
      opciones: (p.opciones ?? []).join(", "),
    });
    setOpen(true);
  }

  async function guardar() {
    if (!form.label.trim() || !form.seccion.trim()) { toast.error("Sección y label requeridos"); return; }
    const clave = (form.clave || form.label).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
    const opcionesArr = form.opciones ? form.opciones.split(",").map(s => s.trim()).filter(Boolean) : null;
    const payload = {
      tipo, seccion: form.seccion.trim(), clave: `custom_${clave}`, label: form.label.trim(),
      tipo_dato: form.tipo_dato, unidad: form.unidad || null, opciones: opcionesArr,
      created_by: user?.id ?? null,
    };
    if (editing) {
      const { error } = await supabase.from("plantilla_parametros").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Parámetro actualizado");
    } else {
      const { error } = await supabase.from("plantilla_parametros").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Parámetro creado");
    }
    setOpen(false); load();
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este parámetro? Los registros existentes no se modificarán.")) return;
    const { error } = await supabase.from("plantilla_parametros").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado"); load();
  }

  return (
    <AppShell title="Parámetros de plantillas">
      <div className="flex items-center justify-between mb-3">
        <Link to="/mantenimiento" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Volver
        </Link>
        <Button size="sm" onClick={openNuevo}><Plus className="size-4" /> Nuevo</Button>
      </div>

      <div className="mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><Sliders className="size-5 text-primary" /> Parámetros</h2>
        <p className="text-xs text-muted-foreground">Añade, edita o elimina parámetros adicionales a cada planilla. Los parámetros base de fábrica no pueden modificarse.</p>
      </div>

      <div className="mb-4">
        <Label className="text-[11px]">Plantilla</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PLANTILLAS.map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {busy ? <p className="text-sm text-muted-foreground">Cargando…</p> : (
        <div className="space-y-4">
          {todasSecciones.map(sec => {
            const baseItems = plantilla?.secciones.find(s => s.titulo === sec)?.items ?? [];
            const customItems = rows.filter(r => r.seccion === sec);
            if (baseItems.length === 0 && customItems.length === 0) return null;
            return (
              <div key={sec} className="glass rounded-xl p-3">
                <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">{sec}</h3>
                <div className="space-y-1.5">
                  {baseItems.map(it => (
                    <div key={it.k} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-secondary/20">
                      <Lock className="size-3 text-muted-foreground" />
                      <span className="flex-1 truncate">{it.l}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{it.t}{it.u ? `·${it.u}` : ""}</span>
                    </div>
                  ))}
                  {customItems.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-primary/5 border border-primary/20">
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span className="flex-1 truncate">{p.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{p.tipo_dato}{p.unidad ? `·${p.unidad}` : ""}</span>
                      <button onClick={() => openEdit(p)} className="size-7 grid place-items-center rounded-md hover:bg-secondary/40"><Pencil className="size-3.5" /></button>
                      <button onClick={() => borrar(p.id)} className="size-7 grid place-items-center rounded-md hover:bg-fail/10 text-fail"><Trash2 className="size-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar parámetro" : "Nuevo parámetro"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Sección">
              <Input list="secciones-list" value={form.seccion} onChange={(e) => setForm({ ...form, seccion: e.target.value })} placeholder="Nombre de sección" />
              <datalist id="secciones-list">{todasSecciones.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Label (texto visible)"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Temperatura de entrada" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tipo de dato">
                <Select value={form.tipo_dato} onValueChange={(v) => setForm({ ...form, tipo_dato: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binario">Sí / No</SelectItem>
                    <SelectItem value="numerico">Numérico</SelectItem>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="opcion">Opción (lista)</SelectItem>
                    <SelectItem value="trio">Trío (R/S/T)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Unidad"><Input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="V / °C / A" /></Field>
            </div>
            {form.tipo_dato === "opcion" && (
              <Field label="Opciones (separadas por coma)">
                <Input value={form.opciones} onChange={(e) => setForm({ ...form, opciones: e.target.value })} placeholder="Ok, Requiere cambio" />
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px]">{label}</Label>{children}</div>;
}

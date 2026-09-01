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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, Plus, Pencil, Trash2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { friendlyDbError } from "@/lib/friendly-errors";
import { PLANTILLAS, getPlantilla, type OverrideRow, type ItemPlantilla } from "@/lib/mantenimiento-plantillas";

export const Route = createFileRoute("/mantenimiento/parametros")({
  component: ParametrosPage,
});

type Param = {
  id: string; tipo: string; seccion: string; clave: string; label: string;
  tipo_dato: string; unidad: string | null; opciones: string[] | null; orden: number;
};

const TIPOS_DATO = [
  { v: "texto", l: "Texto" },
  { v: "numerico", l: "Numérico" },
  { v: "binario", l: "Sí / No" },
  { v: "opcion", l: "Opción (lista)" },
  { v: "trio", l: "Trío R/S/T" },
];

const EMPTY = { seccion: "Personalizados", clave: "", label: "", tipo_dato: "texto", unidad: "", opciones: "", orden: 0 };

function ParametrosPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [tipo, setTipo] = useState(PLANTILLAS[0].id);
  const [rows, setRows] = useState<Param[]>([]);
  const [ovs, setOvs] = useState<OverrideRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Param | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [baseEdit, setBaseEdit] = useState<{ item: ItemPlantilla; seccion: string } | null>(null);
  const [baseForm, setBaseForm] = useState({ label: "", unidad: "", seccion: "", opciones: "" });

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  const plantilla = useMemo(() => getPlantilla(tipo), [tipo]);
  const seccionesBase = plantilla?.secciones.map(s => s.titulo) ?? [];
  const ovMap = useMemo(() => new Map(ovs.map(o => [o.clave, o])), [ovs]);

  async function load() {
    setBusy(true);
    const [pp, po] = await Promise.all([
      supabase.from("plantilla_parametros").select("*").eq("tipo", tipo).order("orden"),
      supabase.from("plantilla_overrides").select("*").eq("tipo", tipo),
    ]);
    setRows((pp.data ?? []) as Param[]);
    setOvs((po.data ?? []) as OverrideRow[]);
    setBusy(false);
  }
  useEffect(() => { load(); }, [tipo]);

  async function upsertOverride(clave: string, patch: Partial<OverrideRow>) {
    const prev = ovMap.get(clave);
    const payload = {
      tipo, clave,
      seccion: patch.seccion ?? prev?.seccion ?? null,
      label: patch.label ?? prev?.label ?? null,
      unidad: patch.unidad ?? prev?.unidad ?? null,
      opciones: patch.opciones ?? prev?.opciones ?? null,
      oculto: patch.oculto ?? prev?.oculto ?? false,
      created_by: user?.id ?? null,
    };
    const { error } = await supabase.from("plantilla_overrides").upsert(payload, { onConflict: "tipo,clave" });
    if (error) { toast.error(friendlyDbError(error)); return; }
    load();
  }

  async function restaurarBase(clave: string) {
    const { error } = await supabase.from("plantilla_overrides").delete().eq("tipo", tipo).eq("clave", clave);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success("Parámetro restaurado"); load();
  }

  function startBaseEdit(item: ItemPlantilla, seccion: string) {
    const o = ovMap.get(item.k);
    setBaseEdit({ item, seccion });
    setBaseForm({
      label: o?.label ?? item.l,
      unidad: o?.unidad ?? item.u ?? "",
      seccion: o?.seccion ?? seccion,
      opciones: (o?.opciones ?? item.o ?? []).join(", "),
    });
  }

  async function saveBaseEdit() {
    if (!baseEdit) return;
    if (!baseForm.label.trim()) { toast.error("La etiqueta es obligatoria"); return; }
    await upsertOverride(baseEdit.item.k, {
      label: baseForm.label.trim(),
      unidad: baseForm.unidad.trim() || null,
      seccion: baseForm.seccion.trim() || baseEdit.seccion,
      opciones: baseEdit.item.t === "opcion" ? baseForm.opciones.split(",").map(s => s.trim()).filter(Boolean) : null,
      oculto: false,
    });
    setBaseEdit(null);
    toast.success("Parámetro actualizado");
  }

  function startNew() {
    setEditing(null);
    setForm({ ...EMPTY, seccion: "Personalizados", orden: rows.length });
    setOpen(true);
  }
  function startEdit(r: Param) {
    setEditing(r);
    setForm({
      seccion: r.seccion, clave: r.clave, label: r.label, tipo_dato: r.tipo_dato,
      unidad: r.unidad ?? "", opciones: (r.opciones ?? []).join(", "), orden: r.orden,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.label.trim()) { toast.error("La etiqueta es obligatoria"); return; }
    const clave = (form.clave || form.label).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!clave) { toast.error("Clave inválida"); return; }
    const opciones = form.tipo_dato === "opcion"
      ? form.opciones.split(",").map(s => s.trim()).filter(Boolean)
      : null;
    if (form.tipo_dato === "opcion" && (!opciones || opciones.length === 0)) { toast.error("Define al menos una opción separada por comas"); return; }
    const payload = {
      tipo, seccion: form.seccion.trim() || "Personalizados", clave, label: form.label.trim(),
      tipo_dato: form.tipo_dato, unidad: form.unidad || null, opciones, orden: Number(form.orden) || 0,
    };
    const q = editing
      ? supabase.from("plantilla_parametros").update(payload).eq("id", editing.id)
      : supabase.from("plantilla_parametros").insert({ ...payload, created_by: user?.id ?? null });
    const { error } = await q;
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(editing ? "Parámetro actualizado" : "Parámetro creado");
    setOpen(false); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("plantilla_parametros").delete().eq("id", id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success("Parámetro eliminado"); load();
  }

  return (
    <AppShell title="Parámetros">
      <div className="flex items-center justify-between mb-4">
        <Link to="/mantenimiento" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Volver
        </Link>
        <Button size="sm" onClick={startNew}><Plus className="size-4" /> Nuevo</Button>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><SlidersHorizontal className="size-5 text-primary" /> Parámetros del formulario</h2>
        <p className="text-xs text-muted-foreground mt-1">Añade, edita o elimina parámetros adicionales que aparecerán en el formulario de mantenimiento por tipo de equipo.</p>
      </div>

      <div className="glass rounded-xl p-3 mb-3">
        <Label className="text-[11px]">Tipo de equipo</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{PLANTILLAS.map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.nombre}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground mt-2">Secciones base: {seccionesBase.join(" · ")}</p>
      </div>

      <h3 className="text-sm font-semibold mb-2 mt-4">Parámetros personalizados</h3>
      {busy ? <p className="text-sm text-muted-foreground">Cargando…</p> : rows.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">Sin parámetros personalizados para este tipo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{r.label} {r.unidad && <span className="text-muted-foreground font-normal">({r.unidad})</span>}</p>
                <p className="text-[11px] text-muted-foreground truncate">{r.seccion} · {r.tipo_dato}{r.opciones?.length ? ` · ${r.opciones.join("/")}` : ""}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="size-4" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost"><Trash2 className="size-4 text-fail" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar parámetro</AlertDialogTitle>
                    <AlertDialogDescription>¿Eliminar "{r.label}"? Los registros existentes mantendrán el dato.</AlertDialogDescription>
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

      <h3 className="text-sm font-semibold mb-2 mt-6">Parámetros estándar</h3>
      <p className="text-[11px] text-muted-foreground mb-2">Puedes renombrar, cambiar unidad/sección u ocultar cualquier parámetro estándar. Los datos ya guardados no se borran.</p>
      <div className="space-y-3">
        {(plantilla?.secciones ?? []).map(sec => (
          <div key={sec.titulo} className="glass rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{sec.titulo}</p>
            <div className="space-y-1.5">
              {sec.items.map(it => {
                const o = ovMap.get(it.k);
                const oculto = !!o?.oculto;
                return (
                  <div key={it.k} className={`flex items-center gap-2 ${oculto ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${oculto ? "line-through" : ""}`}>
                        {o?.label ?? it.l} {(o?.unidad ?? it.u) && <span className="text-muted-foreground">({o?.unidad ?? it.u})</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{it.t}{o ? " · modificado" : ""}{o?.seccion && o.seccion !== sec.titulo ? ` · → ${o.seccion}` : ""}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => startBaseEdit(it, sec.titulo)}><Pencil className="size-4" /></Button>
                    {oculto ? (
                      <Button size="icon" variant="ghost" onClick={() => restaurarBase(it.k)}><RotateCcw className="size-4" /></Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => upsertOverride(it.k, { oculto: true })}><EyeOff className="size-4 text-fail" /></Button>
                    )}
                    {o && !oculto && (
                      <Button size="icon" variant="ghost" onClick={() => restaurarBase(it.k)}><RotateCcw className="size-4" /></Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!baseEdit} onOpenChange={(v) => !v && setBaseEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar parámetro estándar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Etiqueta *"><Input value={baseForm.label} onChange={(e) => setBaseForm({ ...baseForm, label: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Unidad"><Input value={baseForm.unidad} onChange={(e) => setBaseForm({ ...baseForm, unidad: e.target.value })} /></Field>
              <Field label="Sección">
                <Input list="sec-list" value={baseForm.seccion} onChange={(e) => setBaseForm({ ...baseForm, seccion: e.target.value })} />
              </Field>
            </div>
            {baseEdit?.item.t === "opcion" && (
              <Field label="Opciones (separadas por coma)"><Input value={baseForm.opciones} onChange={(e) => setBaseForm({ ...baseForm, opciones: e.target.value })} /></Field>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaseEdit(null)}>Cancelar</Button>
            <Button onClick={saveBaseEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar parámetro" : "Nuevo parámetro"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Etiqueta *"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ej. Temperatura ambiente" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Sección">
                <Input list="sec-list" value={form.seccion} onChange={(e) => setForm({ ...form, seccion: e.target.value })} />
                <datalist id="sec-list">
                  {seccionesBase.map(s => <option key={s} value={s} />)}
                  <option value="Personalizados" />
                </datalist>
              </Field>
              <Field label="Tipo de dato">
                <Select value={form.tipo_dato} onValueChange={(v) => setForm({ ...form, tipo_dato: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_DATO.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Unidad"><Input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="°C, V, A…" /></Field>
              <Field label="Orden"><Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} /></Field>
            </div>
            {form.tipo_dato === "opcion" && (
              <Field label="Opciones (separadas por coma)"><Input value={form.opciones} onChange={(e) => setForm({ ...form, opciones: e.target.value })} placeholder="Ok, Requiere cambio" /></Field>
            )}
            <Field label="Clave (opcional, autogenerada)"><Input value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} placeholder={form.label ? form.label.toLowerCase().replace(/[^a-z0-9]+/g, "_") : "clave_unica"} /></Field>
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

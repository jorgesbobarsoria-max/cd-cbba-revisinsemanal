import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronLeft, Save, Check, X, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { friendlyDbError } from "@/lib/friendly-errors";
import { getPlantilla, type ItemPlantilla } from "@/lib/mantenimiento-plantillas";
import { PhotoCapture } from "@/components/photo-capture";
import { uploadEvidencia } from "@/lib/photo-utils";
import { BTA521Import } from "@/components/bta521-import";
import { BTA521_KEY } from "@/lib/bta521";

export const Route = createFileRoute("/mantenimiento/nuevo/$tipo")({
  component: NuevoMantPage,
});

type Equipo = { id: string; tag: string; categoria: string; marca: string | null; modelo: string | null };
type Externo = { id: string; tag: string; tipo: string; marca: string | null; modelo: string | null; serie: string | null; capacidad: string | null; ubicacion: string | null };
type ExtraParam = { id: string; seccion: string; clave: string; label: string; tipo_dato: string; unidad: string | null; opciones: string[] | null; orden: number };

function NuevoMantPage() {
  const { tipo } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const plantillaBase = useMemo(() => getPlantilla(tipo), [tipo]);

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [externos, setExternos] = useState<Externo[]>([]);
  const [extras, setExtras] = useState<ExtraParam[]>([]);
  const [modoExterno, setModoExterno] = useState(false);
  const [equipoId, setEquipoId] = useState<string>("");
  const [externoId, setExternoId] = useState<string>("");
  const [guardarExterno, setGuardarExterno] = useState(true);
  const [ext, setExt] = useState({ tag: "", modelo: "", serie: "", marca: "", capacidad: "", ubicacion: "" });
  const [meta, setMeta] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    tecnico: "", cargo: "", actividad: "", proyecto: "",
    ciudad: "", direccion: "", empresa: "",
  });
  const [datos, setDatos] = useState<Record<string, any>>({});
  const [obs, setObs] = useState("");
  const [fotos, setFotos] = useState<Record<string, File[]>>({});
  const [busy, setBusy] = useState(false);
  const setFotoBucket = (k: string) => (files: File[]) => setFotos(f => ({ ...f, [k]: files }));

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    (async () => {
      const [eq, ex, pp] = await Promise.all([
        plantillaBase?.categoriaEquipo
          ? supabase.from("equipos").select("id,tag,categoria,marca,modelo").eq("categoria", plantillaBase.categoriaEquipo).order("orden")
          : Promise.resolve({ data: [] as Equipo[] }),
        supabase.from("equipos_externos").select("id,tag,tipo,marca,modelo,serie,capacidad,ubicacion").eq("tipo", tipo).order("tag"),
        supabase.from("plantilla_parametros").select("*").eq("tipo", tipo).order("orden"),
      ]);
      setEquipos((eq.data ?? []) as Equipo[]);
      setExternos((ex.data ?? []) as Externo[]);
      setExtras((pp.data ?? []) as ExtraParam[]);
      if (!plantillaBase?.categoriaEquipo) setModoExterno(true);
    })();
  }, [tipo, plantillaBase?.categoriaEquipo]);

  // Plantilla final = base + parámetros personalizados agrupados por sección
  const plantilla = useMemo(() => {
    if (!plantillaBase) return undefined;
    if (extras.length === 0) return plantillaBase;
    const secciones = plantillaBase.secciones.map(s => ({ ...s, items: [...s.items] }));
    for (const p of extras) {
      const item: ItemPlantilla = {
        k: `x_${p.clave}`, l: p.label, t: p.tipo_dato as any,
        u: p.unidad ?? undefined, o: p.opciones ?? undefined,
      };
      const idx = secciones.findIndex(s => s.titulo === p.seccion);
      if (idx >= 0) secciones[idx].items.push(item);
      else secciones.push({ titulo: p.seccion, items: [item] });
    }
    return { ...plantillaBase, secciones };
  }, [plantillaBase, extras]);


  if (!plantilla) {
    return <AppShell title="Mantenimiento"><p className="text-sm text-muted-foreground">Tipo no válido.</p></AppShell>;
  }

  function setItem(k: string, v: any) { setDatos(d => ({ ...d, [k]: v })); }

  async function guardar(finalizar: boolean) {
    if (!modoExterno && !equipoId) { toast.error("Selecciona un equipo o usa Equipo no registrado"); return; }
    let extData: any = null;
    if (modoExterno) {
      if (externoId) {
        const found = externos.find(e => e.id === externoId);
        if (!found) { toast.error("Equipo externo no encontrado"); return; }
        extData = { id: found.id, tag: found.tag, modelo: found.modelo, serie: found.serie, marca: found.marca, capacidad: found.capacidad, ubicacion: found.ubicacion };
      } else {
        if (!ext.tag && !ext.modelo) { toast.error("Indica al menos TAG o Modelo del equipo"); return; }
        extData = ext;
        if (guardarExterno && ext.tag) {
          const { data: nuevo } = await supabase.from("equipos_externos")
            .insert({ tipo, tag: ext.tag, marca: ext.marca || null, modelo: ext.modelo || null, serie: ext.serie || null, capacidad: ext.capacidad || null, ubicacion: ext.ubicacion || null, created_by: user?.id ?? null })
            .select("id").single();
          if (nuevo?.id) extData = { ...extData, id: nuevo.id };
        }
      }
    }
    setBusy(true);
    const payload = {
      tipo,
      equipo_id: modoExterno ? null : equipoId,
      equipo_externo: extData,
      fecha: meta.fecha,
      tecnico: meta.tecnico || null,
      cargo: meta.cargo || null,
      actividad: meta.actividad || null,
      proyecto: meta.proyecto || null,
      ciudad: meta.ciudad || null,
      direccion: meta.direccion || null,
      empresa: meta.empresa || null,
      observaciones: obs || null,
      datos,
      estado: finalizar ? "finalizado" : "borrador",
      created_by: user?.id ?? null,
    };
    const { data, error } = await supabase.from("mantenimientos").insert(payload).select("id").single();
    if (error) { setBusy(false); toast.error(friendlyDbError(error)); return; }
    const mantId = data!.id;

    // Subir fotos capturadas (diferidas)
    const equipoRef = modoExterno ? (extData?.tag ?? extData?.modelo ?? null) : equipoId;
    try {
      for (const [key, files] of Object.entries(fotos)) {
        if (!files.length) continue;
        const [scope, paramKey] = key.split(":") as ["general" | "parametro", string | undefined];
        for (const f of files) {
          await uploadEvidencia({
            parent: { mantenimiento_id: mantId },
            scope: scope === "parametro" ? "parametro" : "general",
            equipo_ref: equipoRef,
            param_key: paramKey ?? null,
            file: f,
            createdBy: user?.id ?? null,
          });
        }
      }
    } catch (e: any) { toast.error("Fotos: " + (e.message ?? "error al subir")); }

    setBusy(false);
    toast.success(finalizar ? "Mantenimiento finalizado" : "Borrador guardado");
    nav({ to: "/mantenimiento/$id", params: { id: mantId } });
  }


  // Progreso: cuántos ítems tienen valor
  const totalItems = plantilla.secciones.reduce((s, x) => s + x.items.length, 0);
  const filled = Object.values(datos).filter(v => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && v.every(x => !x))).length;
  const pct = totalItems ? Math.round((filled / totalItems) * 100) : 0;

  return (
    <AppShell title={plantilla.nombre}>
      <div className="flex items-center justify-between mb-4">
        <Link to="/mantenimiento" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Volver
        </Link>
        <div className="text-[11px] text-muted-foreground">{filled}/{totalItems} · {pct}%</div>
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{plantilla.icon}</span>
          <h2 className="text-lg font-bold">{plantilla.nombre}</h2>
        </div>
        <div className="h-1 rounded-full bg-secondary/40 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Equipo */}
      <section className="glass rounded-xl p-3.5 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Equipo</h3>
          <div className="inline-flex rounded-md bg-secondary/40 p-0.5 text-[11px]">
            <button type="button" onClick={() => setModoExterno(false)}
              className={`px-2.5 py-1 rounded ${!modoExterno ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              disabled={!plantilla.categoriaEquipo}>Registrado</button>
            <button type="button" onClick={() => setModoExterno(true)}
              className={`px-2.5 py-1 rounded ${modoExterno ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>No registrado</button>
          </div>
        </div>

        {!modoExterno ? (
          <>
            <Select value={equipoId} onValueChange={setEquipoId}>
              <SelectTrigger><SelectValue placeholder={`Selecciona equipo (${equipos.length})`} /></SelectTrigger>
              <SelectContent>
                {equipos.map(e => <SelectItem key={e.id} value={e.id}>{e.tag} · {e.id}</SelectItem>)}
              </SelectContent>
            </Select>
            {equipos.length === 0 && plantilla.categoriaEquipo && (
              <p className="text-[11px] text-muted-foreground">No hay equipos en la categoría "{plantilla.categoriaEquipo}". Usa "No registrado".</p>
            )}
          </>
        ) : (
          <>
            {externos.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[11px]">Equipos guardados ({externos.length})</Label>
                <Select value={externoId || "__nuevo__"} onValueChange={(v) => {
                  if (v === "__nuevo__") { setExternoId(""); return; }
                  setExternoId(v);
                  const f = externos.find(e => e.id === v);
                  if (f) setExt({ tag: f.tag, modelo: f.modelo ?? "", serie: f.serie ?? "", marca: f.marca ?? "", capacidad: f.capacidad ?? "", ubicacion: f.ubicacion ?? "" });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__nuevo__">＋ Ingresar nuevo manualmente</SelectItem>
                    {externos.map(e => <SelectItem key={e.id} value={e.id}>{e.tag} · {e.modelo ?? e.marca ?? "—"}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Link to="/mantenimiento/equipos-externos" className="text-[10px] text-primary hover:underline">Administrar equipos no registrados →</Link>
              </div>
            )}
            {!externoId && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="TAG"><Input value={ext.tag} onChange={(e) => setExt({ ...ext, tag: e.target.value })} placeholder="UPS-EXT-01" /></Field>
                  <Field label="Modelo"><Input value={ext.modelo} onChange={(e) => setExt({ ...ext, modelo: e.target.value })} /></Field>
                  <Field label="Nº Serie"><Input value={ext.serie} onChange={(e) => setExt({ ...ext, serie: e.target.value })} /></Field>
                  <Field label="Marca"><Input value={ext.marca} onChange={(e) => setExt({ ...ext, marca: e.target.value })} /></Field>
                  <Field label="Capacidad"><Input value={ext.capacidad} onChange={(e) => setExt({ ...ext, capacidad: e.target.value })} /></Field>
                  <Field label="Ubicación"><Input value={ext.ubicacion} onChange={(e) => setExt({ ...ext, ubicacion: e.target.value })} /></Field>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={guardarExterno} onChange={(e) => setGuardarExterno(e.target.checked)} className="accent-primary" />
                  Guardar este equipo en el catálogo de "no registrados" para futuros mantenimientos
                </label>
              </>
            )}
          </>
        )}

      </section>

      {/* Datos generales */}
      <section className="glass rounded-xl p-3.5 mb-4 space-y-2">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Datos generales</h3>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fecha"><Input type="date" value={meta.fecha} onChange={(e) => setMeta({ ...meta, fecha: e.target.value })} /></Field>
          <Field label="Técnico"><Input value={meta.tecnico} onChange={(e) => setMeta({ ...meta, tecnico: e.target.value })} /></Field>
          <Field label="Cargo"><Input value={meta.cargo} onChange={(e) => setMeta({ ...meta, cargo: e.target.value })} /></Field>
          <Field label="Actividad"><Input value={meta.actividad} onChange={(e) => setMeta({ ...meta, actividad: e.target.value })} placeholder="Preventivo / Correctivo" /></Field>
          <Field label="Proyecto"><Input value={meta.proyecto} onChange={(e) => setMeta({ ...meta, proyecto: e.target.value })} /></Field>
          <Field label="Empresa"><Input value={meta.empresa} onChange={(e) => setMeta({ ...meta, empresa: e.target.value })} /></Field>
          <Field label="Ciudad"><Input value={meta.ciudad} onChange={(e) => setMeta({ ...meta, ciudad: e.target.value })} /></Field>
          <Field label="Dirección"><Input value={meta.direccion} onChange={(e) => setMeta({ ...meta, direccion: e.target.value })} /></Field>
        </div>
      </section>

      {/* Secciones de checklist */}
      <Accordion type="multiple" defaultValue={[plantilla.secciones[0]?.titulo]} className="space-y-2">
        {plantilla.secciones.map((sec) => {
          const total = sec.items.length;
          const done = sec.items.filter(it => hasValue(datos[it.k])).length;
          return (
            <AccordionItem key={sec.titulo} value={sec.titulo} className="glass rounded-xl border-none px-3.5">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  <span className="text-sm font-semibold">{sec.titulo}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${done === total ? "bg-ok/15 text-ok" : "bg-secondary/60 text-muted-foreground"}`}>{done}/{total}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                {sec.items.map(it => (
                  <div key={it.k} className="space-y-1.5">
                    <ItemControl item={it} value={datos[it.k]} onChange={(v) => setItem(it.k, v)} />
                    <PhotoCapture
                      mode="deferred"
                      scope="parametro"
                      paramKey={it.k}
                      files={fotos[`parametro:${it.k}`] ?? []}
                      onFilesChange={setFotoBucket(`parametro:${it.k}`)}
                      compact
                    />
                  </div>
                ))}
                {/^bater/i.test(sec.titulo) && (
                  <BTA521Import value={datos[BTA521_KEY] ?? null} onChange={(v) => setItem(BTA521_KEY, v)} />
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <section className="glass rounded-xl p-3.5 mt-4 space-y-2">
        <Label className="text-xs">Observaciones</Label>
        <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Notas, hallazgos, recomendaciones…" className="mt-1" />
        <div>
          <Label className="text-xs">Evidencia fotográfica general</Label>
          <div className="mt-1">
            <PhotoCapture
              mode="deferred"
              scope="general"
              files={fotos["general:"] ?? []}
              onFilesChange={setFotoBucket("general:")}
              label="Foto general"
              compact
            />
          </div>
        </div>
      </section>

      <div className="sticky bottom-20 mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" disabled={busy} onClick={() => guardar(false)}>
          <Save className="size-4" /> Borrador
        </Button>
        <Button className="flex-1" disabled={busy} onClick={() => guardar(true)}>
          <Check className="size-4" /> Finalizar
        </Button>
      </div>
    </AppShell>
  );
}

function hasValue(v: any): boolean {
  if (v === null || v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.some(x => x !== null && x !== undefined && x !== "");
  return true;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px]">{label}</Label>{children}</div>;
}

function ItemControl({ item, value, onChange }: { item: ItemPlantilla; value: any; onChange: (v: any) => void }) {
  if (item.t === "binario") {
    const opts = item.o ?? ["Sí", "No"];
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm flex-1">{item.l}</span>
        <div className="inline-flex rounded-md bg-secondary/40 p-0.5 text-xs">
          {opts.map(o => {
            const sel = value === o;
            return (
              <button key={o} type="button" onClick={() => onChange(sel ? "" : o)}
                className={`px-2.5 py-1 rounded inline-flex items-center gap-1 ${sel ? (o === "Sí" || o === "Ok" ? "bg-ok text-background" : o === "No" ? "bg-fail text-background" : "bg-primary text-primary-foreground") : "text-muted-foreground"}`}>
                {sel && <Check className="size-3" />}{o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (item.t === "opcion") {
    return (
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1"><CircleDot className="size-3 text-muted-foreground" /> {item.l}</Label>
        <Select value={value ?? ""} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{(item.o ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }
  if (item.t === "trio") {
    const arr: string[] = Array.isArray(value) ? value : ["", "", ""];
    return (
      <div className="space-y-1">
        <Label className="text-xs">{item.l} {item.u && <span className="text-muted-foreground">({item.u})</span>}</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map(i => (
            <Input key={i} inputMode="decimal" placeholder={["R/U", "S/V", "T/W"][i]} value={arr[i] ?? ""}
              onChange={(e) => { const n = [...arr]; n[i] = e.target.value; onChange(n); }} className="h-9 text-center" />
          ))}
        </div>
      </div>
    );
  }
  if (item.t === "numerico") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{item.l} {item.u && <span className="text-muted-foreground">({item.u})</span>}</Label>
        <Input inputMode="decimal" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={item.ph} />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">{item.l}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={item.ph} />
    </div>
  );
}

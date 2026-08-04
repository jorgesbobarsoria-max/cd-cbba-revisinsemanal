import { useEffect, useRef, useState } from "react";
import { Camera, X, Loader2, ImagePlus, RotateCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_FOTOS, uploadEvidencia, deleteEvidencia, signedUrl, compressImage,
  validarArchivoFoto, actualizarDescripcionEvidencia,
  type EvidenciaRow, type EvidenciaScope,
} from "@/lib/photo-utils";
import { useAuth } from "@/hooks/use-auth";

type BaseProps = {
  scope: EvidenciaScope;
  equipoRef?: string | null;
  paramKey?: string | null;
  label?: string;
  compact?: boolean;
};

/** Modo inmediato: sube al bucket ni bien se toma la foto. Necesita parent id. */
type ImmediateProps = BaseProps & {
  mode: "immediate";
  parent: { inspeccion_id?: string; mantenimiento_id?: string };
  existing?: EvidenciaRow[];
  onChange?: (rows: EvidenciaRow[]) => void;
};

/** Modo diferido: guarda en memoria, el padre las sube al finalizar. */
type DeferredProps = BaseProps & {
  mode: "deferred";
  files: File[];
  onFilesChange: (files: File[]) => void;
};

type Props = ImmediateProps | DeferredProps;

type Pendiente = { file: File; error: string };

export function PhotoCapture(props: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EvidenciaRow[]>(
    props.mode === "immediate" ? (props.existing ?? []) : [],
  );
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(null);
  const [fallidas, setFallidas] = useState<Pendiente[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [textoDesc, setTextoDesc] = useState("");

  useEffect(() => {
    if (props.mode === "immediate") setRows(props.existing ?? []);
  }, [props.mode === "immediate" ? props.existing : null]);

  useEffect(() => {
    if (props.mode !== "immediate") return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const r of rows) {
        const u = await signedUrl(r.storage_path);
        if (u) next[r.id] = u;
      }
      if (!cancelled) setUrls(next);
    })();
    return () => { cancelled = true; };
  }, [rows]);

  useEffect(() => {
    if (props.mode !== "deferred") return;
    const urls = props.files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [props.mode === "deferred" ? props.files : null]);

  const count = props.mode === "immediate" ? rows.length : props.files.length;
  const disabled = count >= MAX_FOTOS || busy;

  async function procesar(picked: File[]) {
    setBusy(true);
    setProgreso({ hecho: 0, total: picked.length });
    const errores: Pendiente[] = [];

    if (props.mode === "deferred") {
      const compressed: File[] = [];
      for (const f of picked) {
        const invalido = validarArchivoFoto(f);
        if (invalido) { errores.push({ file: f, error: invalido }); setProgreso((p) => p && { ...p, hecho: p.hecho + 1 }); continue; }
        try {
          const blob = await compressImage(f);
          compressed.push(new File([blob], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        } catch (err: any) {
          errores.push({ file: f, error: err?.message ?? "No se pudo procesar la imagen" });
        }
        setProgreso((p) => p && { ...p, hecho: p.hecho + 1 });
      }
      if (compressed.length) props.onFilesChange([...props.files, ...compressed]);
    } else {
      const nuevos: EvidenciaRow[] = [];
      for (const f of picked) {
        const invalido = validarArchivoFoto(f);
        if (invalido) { errores.push({ file: f, error: invalido }); setProgreso((p) => p && { ...p, hecho: p.hecho + 1 }); continue; }
        try {
          const row = await uploadEvidencia({
            parent: props.parent,
            scope: props.scope,
            equipo_ref: props.equipoRef ?? null,
            param_key: props.paramKey ?? null,
            file: f,
            createdBy: user?.id ?? null,
          });
          nuevos.push(row);
        } catch (err: any) {
          errores.push({ file: f, error: err?.message ?? "No se pudo subir la imagen" });
        }
        setProgreso((p) => p && { ...p, hecho: p.hecho + 1 });
      }
      if (nuevos.length) {
        const merged = [...rows, ...nuevos];
        setRows(merged);
        props.onChange?.(merged);
        toast.success(`${nuevos.length} foto${nuevos.length > 1 ? "s" : ""} guardada${nuevos.length > 1 ? "s" : ""}`);
      }
    }

    setFallidas((prev) => [...prev, ...errores]);
    if (errores.length) toast.error(`${errores.length} imagen(es) no se pudieron guardar`);
    setProgreso(null);
    setBusy(false);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const slots = MAX_FOTOS - count;
    const picked = files.slice(0, slots);
    if (files.length > slots) toast.info(`Máximo ${MAX_FOTOS} fotos por punto`);
    if (!picked.length) return;
    await procesar(picked);
  }

  async function reintentar(idx: number) {
    const item = fallidas[idx];
    if (!item) return;
    setFallidas((f) => f.filter((_, i) => i !== idx));
    await procesar([item.file]);
  }

  async function remove(idx: number) {
    if (props.mode === "deferred") {
      const next = [...props.files];
      next.splice(idx, 1);
      props.onFilesChange(next);
      return;
    }
    const row = rows[idx];
    setBusy(true);
    try {
      await deleteEvidencia(row);
      const next = rows.filter((_, i) => i !== idx);
      setRows(next);
      props.onChange?.(next);
    } catch (err: any) { toast.error(err.message ?? "Error al borrar"); }
    setBusy(false);
  }

  async function guardarDescripcion(id: string) {
    try {
      await actualizarDescripcionEvidencia(id, textoDesc.trim());
      const next = rows.map((r) => (r.id === id ? { ...r, caption: textoDesc.trim() || null } : r));
      setRows(next);
      props.mode === "immediate" && props.onChange?.(next);
      setEditando(null);
    } catch (err: any) { toast.error(err.message ?? "No se pudo guardar la descripción"); }
  }

  const thumbs = props.mode === "immediate"
    ? rows.map((r) => ({ url: urls[r.id], key: r.id, id: r.id, caption: r.caption }))
    : previews.map((u, i) => ({ url: u, key: `p${i}`, id: null as string | null, caption: null }));

  return (
    <div className={props.compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/15 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
          {props.label ?? "Foto"}
          <span className="text-[10px] text-muted-foreground font-mono">{count}/{MAX_FOTOS}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          multiple
          className="hidden"
          onChange={onPick}
        />
        {thumbs.map((t, i) => (
          <div key={t.key} className="relative size-14 rounded-md overflow-hidden border border-border bg-surface-1">
            {t.url ? <img src={t.url} className="w-full h-full object-cover" alt={t.caption ?? "Evidencia fotográfica"} /> : <div className="w-full h-full grid place-items-center"><ImagePlus className="size-4 text-muted-foreground/40" /></div>}
            {t.id && (
              <button type="button"
                onClick={() => { setEditando(t.id!); setTextoDesc(t.caption ?? ""); }}
                className="absolute bottom-0 left-0 right-0 h-5 bg-black/55 text-white grid place-items-center"
                aria-label="Describir foto">
                <Pencil className="size-3" />
              </button>
            )}
            <button type="button" onClick={() => remove(i)}
              className="absolute -top-1 -right-1 size-5 rounded-full bg-fail text-white grid place-items-center shadow"
              aria-label="Eliminar foto">
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>

      {progreso && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${(progreso.hecho / progreso.total) * 100}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">Procesando {progreso.hecho} de {progreso.total} imagen(es)…</p>
        </div>
      )}

      {fallidas.map((f, i) => (
        <div key={`${f.file.name}-${i}`} className="flex items-center gap-2 text-[11px] text-fail bg-fail/10 border border-fail/30 rounded-md px-2 py-1.5">
          <span className="flex-1 leading-tight">{f.file.name}: {f.error}</span>
          <button type="button" onClick={() => reintentar(i)} className="inline-flex items-center gap-1 font-semibold min-h-8 px-2">
            <RotateCw className="size-3" /> Reintentar
          </button>
        </div>
      ))}

      {editando && (
        <div className="flex items-center gap-2">
          <input
            value={textoDesc}
            onChange={(e) => setTextoDesc(e.target.value)}
            maxLength={140}
            placeholder="Descripción de la foto (opcional)"
            className="flex-1 min-h-11 rounded-md bg-surface-1 border border-border px-2 text-xs"
          />
          <button type="button" onClick={() => guardarDescripcion(editando)} className="min-h-11 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold">Guardar</button>
          <button type="button" onClick={() => setEditando(null)} className="min-h-11 px-2 text-xs text-muted-foreground">Cancelar</button>
        </div>
      )}
    </div>
  );
}

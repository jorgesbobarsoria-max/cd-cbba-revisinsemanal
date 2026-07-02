import { useEffect, useRef, useState } from "react";
import { Camera, X, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_FOTOS, uploadEvidencia, deleteEvidencia, signedUrl, compressImage,
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

export function PhotoCapture(props: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EvidenciaRow[]>(
    props.mode === "immediate" ? (props.existing ?? []) : [],
  );
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

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

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const slots = MAX_FOTOS - count;
    const picked = files.slice(0, slots);
    if (files.length > slots) toast.info(`Máximo ${MAX_FOTOS} fotos por punto`);

    if (props.mode === "deferred") {
      // Comprimir en memoria para no cargar el DOM con blobs enormes
      setBusy(true);
      try {
        const compressed: File[] = [];
        for (const f of picked) {
          const blob = await compressImage(f);
          compressed.push(new File([blob], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        }
        props.onFilesChange([...props.files, ...compressed]);
      } catch (err: any) { toast.error(err.message ?? "Error al procesar imagen"); }
      setBusy(false);
      return;
    }

    setBusy(true);
    try {
      const nuevos: EvidenciaRow[] = [];
      for (const f of picked) {
        const row = await uploadEvidencia({
          parent: props.parent,
          scope: props.scope,
          equipo_ref: props.equipoRef ?? null,
          param_key: props.paramKey ?? null,
          file: f,
          createdBy: user?.id ?? null,
        });
        nuevos.push(row);
      }
      const merged = [...rows, ...nuevos];
      setRows(merged);
      props.onChange?.(merged);
      toast.success(`${nuevos.length} foto${nuevos.length > 1 ? "s" : ""} guardada${nuevos.length > 1 ? "s" : ""}`);
    } catch (err: any) { toast.error(err.message ?? "Error al subir foto"); }
    setBusy(false);
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

  const thumbs = props.mode === "immediate"
    ? rows.map((r) => ({ url: urls[r.id], key: r.id }))
    : previews.map((u, i) => ({ url: u, key: `p${i}` }));

  return (
    <div className={props.compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/15 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
          {props.label ?? "Foto"}
          <span className="text-[10px] text-muted-foreground font-mono">{count}/{MAX_FOTOS}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={onPick}
        />
        {thumbs.map((t, i) => (
          <div key={t.key} className="relative size-14 rounded-md overflow-hidden border border-border bg-surface-1">
            {t.url ? <img src={t.url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full grid place-items-center"><ImagePlus className="size-4 text-muted-foreground/40" /></div>}
            <button type="button" onClick={() => remove(i)}
              className="absolute -top-1 -right-1 size-5 rounded-full bg-fail text-white grid place-items-center shadow"
              aria-label="Eliminar foto">
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

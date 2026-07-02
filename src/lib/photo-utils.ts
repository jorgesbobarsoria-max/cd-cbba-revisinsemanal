import { supabase } from "@/integrations/supabase/client";

export const MAX_FOTOS = 3;
export const BUCKET = "evidencias";

/** Redimensiona (máx 1600px) y comprime como JPEG 0.8. Devuelve Blob. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", quality),
  );
  bitmap.close?.();
  return blob;
}

export type EvidenciaScope = "general" | "equipo" | "parametro";
export type EvidenciaRow = {
  id: string;
  scope: EvidenciaScope;
  equipo_ref: string | null;
  param_key: string | null;
  storage_path: string;
  caption: string | null;
  orden: number;
  inspeccion_id?: string | null;
  mantenimiento_id?: string | null;
};

export async function uploadEvidencia(opts: {
  parent: { inspeccion_id?: string; mantenimiento_id?: string };
  scope: EvidenciaScope;
  equipo_ref?: string | null;
  param_key?: string | null;
  file: File | Blob;
  caption?: string;
  createdBy?: string | null;
}): Promise<EvidenciaRow> {
  const parentId = opts.parent.inspeccion_id ?? opts.parent.mantenimiento_id!;
  const kind = opts.parent.inspeccion_id ? "insp" : "mant";
  const compressed = opts.file instanceof File ? await compressImage(opts.file) : opts.file;
  const safeKey = (opts.param_key ?? opts.equipo_ref ?? "general").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const path = `${kind}/${parentId}/${opts.scope}/${safeKey}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: "image/jpeg", upsert: false,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase.from("evidencias").insert({
    inspeccion_id: opts.parent.inspeccion_id ?? null,
    mantenimiento_id: opts.parent.mantenimiento_id ?? null,
    scope: opts.scope,
    equipo_ref: opts.equipo_ref ?? null,
    param_key: opts.param_key ?? null,
    storage_path: path,
    caption: opts.caption ?? null,
    created_by: opts.createdBy ?? null,
  }).select("*").single();
  if (error) throw error;
  return data as EvidenciaRow;
}

export async function deleteEvidencia(row: EvidenciaRow) {
  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  await supabase.from("evidencias").delete().eq("id", row.id);
}

export async function signedUrl(path: string, expires = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, expires);
  return data?.signedUrl ?? null;
}

export async function listEvidencias(parent: { inspeccion_id?: string; mantenimiento_id?: string }): Promise<EvidenciaRow[]> {
  const col = parent.inspeccion_id ? "inspeccion_id" : "mantenimiento_id";
  const val = parent.inspeccion_id ?? parent.mantenimiento_id!;
  const { data } = await supabase.from("evidencias").select("*").eq(col, val).order("created_at");
  return (data ?? []) as EvidenciaRow[];
}

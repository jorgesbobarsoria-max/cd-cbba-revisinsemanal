import { cn } from "@/lib/utils";

export function Semaforo({ estado, className }: { estado?: string | null; className?: string }) {
  const map: Record<string, { bg: string; label: string; ring: string }> = {
    verde:    { bg: "bg-ok",         label: "OK",     ring: "ring-ok/40" },
    amarillo: { bg: "bg-warn",       label: "ALERTA", ring: "ring-warn/40" },
    rojo:     { bg: "bg-fail",       label: "FALLA",  ring: "ring-fail/40" },
    gris:     { bg: "bg-muted",      label: "N/A",    ring: "ring-muted-foreground/30" },
  };
  const e = map[estado ?? "gris"] ?? map.gris;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ring-1", e.ring, className)}>
      <span className={cn("size-1.5 rounded-full", e.bg)} />
      {e.label}
    </span>
  );
}

export function evaluar(valor: string | undefined, p: { tipo: string; min_ok?: number | null; max_ok?: number | null; min_alerta?: number | null; max_alerta?: number | null }, estadoManual?: string): string {
  if (estadoManual === "NA") return "gris";
  if (estadoManual === "FALLA") return "rojo";
  if (estadoManual === "OK") return "verde";
  if (estadoManual === "ALERTA") return "amarillo";
  if (p.tipo === "binario") {
    if (valor === "No") return "verde";
    if (valor === "Sí") return "rojo";
    return "gris";
  }
  if (p.tipo === "texto" || p.tipo === "estado") {
    return valor && valor.trim() !== "" ? "verde" : "gris";
  }
  if (valor == null || valor === "") return "gris";
  // Soporte multivaluado: "v1|v2|v3" — devuelve el peor semáforo.
  const partes = String(valor).split("|").map((v) => v.trim()).filter((v) => v !== "");
  if (partes.length === 0) return "gris";
  const rank: Record<string, number> = { rojo: 3, amarillo: 2, verde: 1, gris: 0 };
  let worst = "gris";
  for (const raw of partes) {
    const n = parseFloat(raw.replace(",", "."));
    let s: string;
    if (isNaN(n)) s = "gris";
    else if (p.min_ok != null && p.max_ok != null && n >= p.min_ok && n <= p.max_ok) s = "verde";
    else if (p.min_alerta != null && p.max_alerta != null && n >= p.min_alerta && n <= p.max_alerta) s = "amarillo";
    else s = "rojo";
    if (rank[s] > rank[worst]) worst = s;
  }
  return worst;
}


import { cn } from "@/lib/utils";
import { evaluarPunto, type ReglaPunto } from "@/lib/evaluacion";

export function Semaforo({ estado, className }: { estado?: string | null; className?: string }) {
  const map: Record<string, { bg: string; label: string; ring: string }> = {
    verde:    { bg: "bg-ok",    label: "OK",     ring: "ring-ok/40" },
    amarillo: { bg: "bg-warn",  label: "ALERTA", ring: "ring-warn/40" },
    rojo:     { bg: "bg-fail",  label: "FALLA",  ring: "ring-fail/40" },
    gris:     { bg: "bg-muted", label: "N/A",    ring: "ring-muted-foreground/30" },
  };
  const e = map[estado ?? "gris"] ?? map.gris;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ring-1", e.ring, className)}>
      <span className={cn("size-1.5 rounded-full", e.bg)} />
      {e.label}
    </span>
  );
}

/**
 * Wrapper de compatibilidad: delega en el motor único de `@/lib/evaluacion`
 * para que formularios, dashboard e informes usen exactamente la misma regla.
 */
export function evaluar(valor: string | undefined, p: ReglaPunto, estadoManual?: string): string {
  return evaluarPunto(valor, p, estadoManual);
}

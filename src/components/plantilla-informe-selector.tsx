import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlantillaInforme } from "@/lib/reporte-mantenimiento.functions";

export const PLANTILLAS_INFORME: { id: PlantillaInforme; label: string; desc: string; icon: string }[] = [
  { id: "completo",  label: "Completo",       desc: "Antecedentes, objeto, ficha, parámetros, tendencias y recomendaciones", icon: "📘" },
  { id: "tecnico",   label: "Técnico",        desc: "Ficha, parámetros y gráficas de tendencia (sin antecedentes)",         icon: "🔧" },
  { id: "ejecutivo", label: "Ejecutivo",      desc: "Resumen breve, hallazgos, conclusiones y recomendaciones",             icon: "📊" },
  { id: "checklist", label: "Checklist",      desc: "Lista de verificación por sección, sin gráficas",                       icon: "✅" },
  { id: "por-tipo",  label: "Adaptativo",     desc: "Formato optimizado según el tipo de equipo (UPS, Clima, MDC, …)",       icon: "🧭" },
];

export function PlantillaInformeSelector({
  value,
  onChange,
  className,
}: { value: PlantillaInforme; onChange: (v: PlantillaInforme) => void; className?: string }) {
  const cur = PLANTILLAS_INFORME.find((p) => p.id === value) ?? PLANTILLAS_INFORME[0];
  return (
    <div className={className}>
      <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold block mb-1">
        Plantilla del informe
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as PlantillaInforme)}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span>{cur.icon}</span>
              <span className="font-medium">{cur.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PLANTILLAS_INFORME.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <div className="flex flex-col">
                <span className="text-xs font-medium">{p.icon} {p.label}</span>
                <span className="text-[10px] text-muted-foreground max-w-[260px]">{p.desc}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

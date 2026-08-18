import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText, Trash2, Loader2, BatteryCharging } from "lucide-react";
import { toast } from "sonner";
import { parseBTA521, type BateriasImportadas } from "@/lib/bta521";

const estadoClase: Record<string, string> = {
  buena: "text-ok",
  regular: "text-warn",
  critica: "text-fail",
  sin_dato: "text-muted-foreground",
};
const estadoLabel: Record<string, string> = { buena: "Buena", regular: "Regular", critica: "Crítica", sin_dato: "—" };

function n(v: number | null, d = 2) {
  return v == null ? "—" : v.toFixed(d);
}

export function BTA521Import({
  value,
  onChange,
  readOnly,
}: {
  value?: BateriasImportadas | null;
  onChange?: (v: BateriasImportadas | null) => void;
  readOnly?: boolean;
}) {
  const excelRef = useRef<HTMLInputElement>(null);
  const wordRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("El archivo supera los 15 MB.");
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = parseBTA521(bytes, file.name);
      onChange?.(parsed);
      toast.success(`${parsed.mediciones.length} mediciones importadas del BTA 521`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo analizar el archivo");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <BatteryCharging className="size-4 text-primary" />
        <Label className="text-xs font-semibold">Resistencia interna de baterías · Fluke BTA 521</Label>
      </div>

      {!readOnly && (
        <>
          <p className="text-[11px] text-muted-foreground">
            Importa la planilla generada por el software del instrumento en formato Excel (.xlsx) o Word (.docx).
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="flex-1" disabled={busy} onClick={() => excelRef.current?.click()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />} Excel
            </Button>
            <Button type="button" size="sm" variant="outline" className="flex-1" disabled={busy} onClick={() => wordRef.current?.click()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />} Word
            </Button>
          </div>
          <input ref={excelRef} type="file" accept=".xlsx,.xlsm" hidden onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={wordRef} type="file" accept=".docx" hidden onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
        </>
      )}

      {value && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground truncate">
              {value.formato === "excel" ? "📊" : "📄"} {value.archivo}
            </span>
            {!readOnly && (
              <Button type="button" size="sm" variant="ghost" className="text-fail hover:text-fail h-7 px-2" onClick={() => onChange?.(null)}>
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              ["Celdas", String(value.resumen.cantidad)],
              ["Prom. mΩ", n(value.resumen.promedio)],
              ["Máx. mΩ", n(value.resumen.maximo)],
              ["Desv. máx.", value.resumen.desviacionMax == null ? "—" : `${value.resumen.desviacionMax.toFixed(0)}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md bg-background/50 py-1.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</p>
                <p className="text-sm font-mono font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 text-[11px]">
            <span className="text-ok">Buenas: {value.resumen.buenas}</span>
            <span className="text-warn">Regulares: {value.resumen.regulares}</span>
            <span className="text-fail">Críticas: {value.resumen.criticas}</span>
          </div>

          <div className="max-h-56 overflow-auto rounded-md border border-border/50">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-secondary/80">
                <tr>
                  <th className="text-left px-2 py-1">Celda</th>
                  <th className="text-right px-2 py-1">mΩ</th>
                  <th className="text-right px-2 py-1">V</th>
                  <th className="text-right px-2 py-1">Estado</th>
                </tr>
              </thead>
              <tbody>
                {value.mediciones.map((m) => (
                  <tr key={m.n} className="border-t border-border/40">
                    <td className="px-2 py-1">{m.etiqueta}</td>
                    <td className="px-2 py-1 text-right font-mono">{n(m.resistencia)}</td>
                    <td className="px-2 py-1 text-right font-mono">{n(m.voltaje)}</td>
                    <td className={`px-2 py-1 text-right font-semibold ${estadoClase[m.estado]}`}>{estadoLabel[m.estado]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground">{value.resumen.diagnostico}</p>
        </div>
      )}
    </div>
  );
}

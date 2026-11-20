import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export type AttributeRow = { nombre: string; valor: string };
export function UserAttributesEditor({ cargo, onCargoChange, rows, onChange }: {
  cargo: string; onCargoChange: (v: string) => void; rows: AttributeRow[]; onChange: (v: AttributeRow[]) => void;
}) {
  return <div className="space-y-3">
    <Label className="block space-y-1"><span>Cargo</span><Input value={cargo} maxLength={120} onChange={e => onCargoChange(e.target.value)} /></Label>
    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Otros atributos</span><Button type="button" size="sm" variant="outline" onClick={() => onChange([...rows, { nombre: "", valor: "" }])}><Plus className="size-4" /> Añadir atributo</Button></div>
    {rows.map((row, i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input aria-label={`Nombre del atributo ${i + 1}`} placeholder="Nombre del atributo" maxLength={80} value={row.nombre} onChange={e => onChange(rows.map((r, j) => j === i ? { ...r, nombre: e.target.value } : r))} />
        <Input aria-label={`Valor del atributo ${i + 1}`} placeholder="Valor" maxLength={500} value={row.valor} onChange={e => onChange(rows.map((r, j) => j === i ? { ...r, valor: e.target.value } : r))} />
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label={`Quitar atributo ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
    </div>)}
  </div>;
}
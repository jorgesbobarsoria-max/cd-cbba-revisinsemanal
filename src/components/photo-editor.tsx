import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  Crop,
  Grid3X3,
  ImageIcon,
  Pencil,
  RotateCw,
  SlidersHorizontal,
  Type,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: BrushColor; width: number };
type TextMark = { text: string; x: number; y: number; color: BrushColor };
type Tool = "crop" | "adjust" | "filters" | "draw" | "text" | "mosaic";
type BrushColor = "primary" | "foreground" | "fail" | "warn";

type Props = {
  file: File;
  index: number;
  total: number;
  onDone: (file: File) => void;
  onCancel: () => void;
};

const MAX_PREVIEW = 1000;
const tools: { id: Tool; label: string; icon: typeof Crop }[] = [
  { id: "crop", label: "Recortar", icon: Crop },
  { id: "adjust", label: "Ajustar", icon: SlidersHorizontal },
  { id: "filters", label: "Filtros", icon: ImageIcon },
  { id: "draw", label: "Dibujar", icon: Pencil },
  { id: "text", label: "Texto", icon: Type },
  { id: "mosaic", label: "Mosaico", icon: Grid3X3 },
];

const filters = [
  { id: "normal", label: "Original", value: "" },
  { id: "vivid", label: "Vivo", value: "contrast(115%) saturate(135%)" },
  { id: "clear", label: "Claro", value: "brightness(108%) contrast(108%)" },
  { id: "mono", label: "B/N", value: "grayscale(100%) contrast(110%)" },
  { id: "warm", label: "Cálido", value: "sepia(25%) saturate(120%)" },
] as const;

function rotatedSize(w: number, h: number, rot: number) {
  return rot % 180 === 0 ? { w, h } : { w: h, h: w };
}

const colorCache = new Map<BrushColor, string>();
function cssColor(name: BrushColor) {
  const hit = colorCache.get(name);
  if (hit) return hit;
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim() || "currentColor";
  colorCache.set(name, value);
  return value;
}

/** Imagen ya rotada y reescalada una sola vez; redibujar filtros sobre ella es mucho más rápido. */
function makeBase(img: HTMLImageElement, rot: number, maxSide: number) {
  const size = rotatedSize(img.width, img.height, rot);
  const scale = Math.min(1, maxSide / Math.max(size.w, size.h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(size.w * scale));
  canvas.height = Math.max(1, Math.round(size.h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingQuality = "medium";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return canvas;
}

function drawBase(ctx: CanvasRenderingContext2D, base: HTMLCanvasElement, filter: string) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.filter = filter;
  ctx.drawImage(base, 0, 0, width, height);
  ctx.restore();
  ctx.filter = "none";
}

function applyMosaic(ctx: CanvasRenderingContext2D, rect: Rect) {
  const x = Math.round(rect.x * ctx.canvas.width);
  const y = Math.round(rect.y * ctx.canvas.height);
  const w = Math.max(1, Math.round(rect.w * ctx.canvas.width));
  const h = Math.max(1, Math.round(rect.h * ctx.canvas.height));
  const sample = document.createElement("canvas");
  const pixel = Math.max(5, Math.round(Math.min(w, h) / 18));
  sample.width = Math.max(1, Math.ceil(w / pixel));
  sample.height = Math.max(1, Math.ceil(h / pixel));
  const sampleCtx = sample.getContext("2d");
  if (!sampleCtx) return;
  sampleCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, sample.width, sample.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sample, 0, 0, sample.width, sample.height, x, y, w, h);
  ctx.restore();
}

function drawMarks(ctx: CanvasRenderingContext2D, strokes: Stroke[], texts: TextMark[]) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    ctx.beginPath();
    ctx.strokeStyle = cssColor(stroke.color);
    ctx.lineWidth = stroke.width * Math.max(ctx.canvas.width, ctx.canvas.height) / 500;
    stroke.points.forEach((p, i) => {
      const x = p.x * ctx.canvas.width;
      const y = p.y * ctx.canvas.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  for (const mark of texts) {
    ctx.fillStyle = cssColor(mark.color);
    ctx.font = `600 ${Math.max(20, ctx.canvas.width / 22)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mark.text, mark.x * ctx.canvas.width, mark.y * ctx.canvas.height, ctx.canvas.width * 0.9);
  }
}

export function PhotoEditor({ file, index, total, onDone, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("crop");
  const [rot, setRot] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [filterId, setFilterId] = useState("normal");
  const [crop, setCrop] = useState<Rect | null>(null);
  const [mosaics, setMosaics] = useState<Rect[]>([]);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawing, setDrawing] = useState<Point[] | null>(null);
  const [brushColor, setBrushColor] = useState<BrushColor>("fail");
  const [brushWidth, setBrushWidth] = useState(5);
  const [texts, setTexts] = useState<TextMark[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preset = filters.find((item) => item.id === filterId)?.value ?? "";
  const canvasFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${preset}`.trim();

  const previewBase = useMemo(() => (img ? makeBase(img, rot, previewMax()) : null), [img, rot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewBase) return;
    if (canvas.width !== previewBase.width || canvas.height !== previewBase.height) {
      canvas.width = previewBase.width;
      canvas.height = previewBase.height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frame = requestAnimationFrame(() => {
      drawBase(ctx, previewBase, canvasFilter);
      mosaics.forEach((rect) => applyMosaic(ctx, rect));
      drawMarks(ctx, drawing ? [...strokes, { points: drawing, color: brushColor, width: brushWidth }] : strokes, texts);
    });
    return () => cancelAnimationFrame(frame);
  }, [previewBase, canvasFilter, mosaics, strokes, texts, drawing, brushColor, brushWidth]);

  function pointerPosition(event: React.PointerEvent): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  }

  function onPointerDown(event: React.PointerEvent) {
    const point = pointerPosition(event);
    if (!point || !["crop", "mosaic", "draw"].includes(tool)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "draw") setDrawing([point]);
    else {
      setDragStart(point);
      setSelection({ x: point.x, y: point.y, w: 0, h: 0 });
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const point = pointerPosition(event);
    if (!point) return;
    if (tool === "draw" && drawing) {
      setDrawing((current) => current ? [...current, point] : null);
      return;
    }
    if (!dragStart) return;
    setSelection({
      x: Math.min(dragStart.x, point.x),
      y: Math.min(dragStart.y, point.y),
      w: Math.abs(point.x - dragStart.x),
      h: Math.abs(point.y - dragStart.y),
    });
  }

  function onPointerUp() {
    if (tool === "draw" && drawing) {
      if (drawing.length > 1) setStrokes((current) => [...current, { points: drawing, color: brushColor, width: brushWidth }]);
      setDrawing(null);
      return;
    }
    if (selection && selection.w > 0.025 && selection.h > 0.025) {
      if (tool === "crop") setCrop(selection);
      if (tool === "mosaic") setMosaics((current) => [...current, selection]);
    }
    setSelection(null);
    setDragStart(null);
  }

  function reset() {
    setRot(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setFilterId("normal");
    setCrop(null);
    setMosaics([]);
    setStrokes([]);
    setTexts([]);
    setSelection(null);
  }

  function addText() {
    const clean = textDraft.trim();
    if (!clean) return;
    setTexts((current) => [...current, { text: clean, x: 0.5, y: 0.5, color: brushColor }]);
    setTextDraft("");
  }

  async function save() {
    if (!img) return;
    setSaving(true);
    try {
      const size = rotatedSize(img.width, img.height, rot);
      const full = document.createElement("canvas");
      full.width = size.w;
      full.height = size.h;
      const ctx = full.getContext("2d");
      if (!ctx) return;
      drawBase(ctx, img, rot, 1, canvasFilter);
      mosaics.forEach((rect) => applyMosaic(ctx, rect));
      drawMarks(ctx, strokes, texts);

      let output = full;
      if (crop) {
        const sx = Math.round(crop.x * size.w);
        const sy = Math.round(crop.y * size.h);
        const sw = Math.max(1, Math.round(crop.w * size.w));
        const sh = Math.max(1, Math.round(crop.h * size.h));
        const cropped = document.createElement("canvas");
        cropped.width = sw;
        cropped.height = sh;
        const cropCtx = cropped.getContext("2d");
        if (!cropCtx) return;
        cropCtx.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
        output = cropped;
      }

      const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) return;
      onDone(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
    } finally {
      setSaving(false);
    }
  }

  const activeSelection = selection ?? (tool === "crop" ? crop : null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-editor text-editor-foreground" role="dialog" aria-modal="true" aria-label="Editor de foto">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-editor-border px-2 safe-area-top">
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="size-11 text-editor-foreground" aria-label="Cancelar edición">
          <ChevronLeft className="size-6" />
        </Button>
        <div className="min-w-0 px-2 text-center">
          <p className="text-sm font-semibold">Editar foto</p>
          <p className="text-[11px] text-editor-muted">{index + 1} de {total}</p>
        </div>
        <Button type="button" onClick={save} disabled={!img || saving} className="h-10 rounded-full px-5 font-bold">
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-editor-stage p-3">
        {!img && <p className="text-sm text-editor-muted">Preparando imagen…</p>}
        <div
          ref={wrapRef}
          className="relative inline-block max-h-full max-w-full touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="block max-h-[calc(100dvh-21rem)] max-w-full object-contain" />
          {activeSelection && (
            <div
              className={cn("pointer-events-none absolute border-2", tool === "mosaic" ? "border-warn bg-warn/15" : "border-primary bg-primary/10")}
              style={{ left: `${activeSelection.x * 100}%`, top: `${activeSelection.y * 100}%`, width: `${activeSelection.w * 100}%`, height: `${activeSelection.h * 100}%` }}
            >
              {tool === "crop" && <><span className="absolute left-1/3 top-0 h-full border-l border-editor-foreground/40" /><span className="absolute left-2/3 top-0 h-full border-l border-editor-foreground/40" /><span className="absolute left-0 top-1/3 w-full border-t border-editor-foreground/40" /><span className="absolute left-0 top-2/3 w-full border-t border-editor-foreground/40" /></>}
            </div>
          )}
        </div>
      </main>

      <section className="shrink-0 border-t border-editor-border bg-editor-panel safe-area-bottom">
        <div className="min-h-24 border-b border-editor-border px-4 py-3">
          {tool === "crop" && <div className="flex items-center justify-center gap-3"><Button type="button" variant="secondary" onClick={() => setRot((value) => (value + 90) % 360)}><RotateCw /> Girar</Button><Button type="button" variant="ghost" disabled={!crop} onClick={() => setCrop(null)}>Quitar recorte</Button></div>}
          {tool === "adjust" && <div className="grid grid-cols-3 gap-3">{[["Brillo", brightness, setBrightness], ["Contraste", contrast, setContrast], ["Color", saturation, setSaturation]].map(([label, value, setter]) => <label key={label as string} className="space-y-1 text-[11px] text-editor-muted"><span>{label as string}</span><input type="range" min="50" max="180" value={value as number} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(event.target.value))} className="w-full accent-primary" /></label>)}</div>}
          {tool === "filters" && <div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <Button key={item.id} type="button" variant={filterId === item.id ? "default" : "secondary"} size="sm" onClick={() => setFilterId(item.id)}>{item.label}</Button>)}</div>}
          {tool === "draw" && <DrawingControls color={brushColor} setColor={setBrushColor} width={brushWidth} setWidth={setBrushWidth} onUndo={() => setStrokes((current) => current.slice(0, -1))} />}
          {tool === "text" && <div className="flex items-center gap-2"><input value={textDraft} maxLength={60} onChange={(event) => setTextDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addText(); }} placeholder="Escriba un texto" className="h-11 min-w-0 flex-1 rounded-md border border-editor-border bg-editor-stage px-3 text-sm outline-none focus:border-primary" /><ColorChoices value={brushColor} onChange={setBrushColor} /><Button type="button" size="icon" onClick={addText} aria-label="Añadir texto"><Check /></Button></div>}
          {tool === "mosaic" && <div className="flex items-center justify-between gap-3"><p className="text-xs text-editor-muted">Marque sobre la imagen el área que desea ocultar.</p><Button type="button" variant="ghost" size="sm" disabled={!mosaics.length} onClick={() => setMosaics((current) => current.slice(0, -1))}><Undo2 /> Deshacer</Button></div>}
        </div>

        <nav className="flex h-24 items-stretch overflow-x-auto px-1" aria-label="Herramientas de edición">
          {tools.map((item) => {
            const Icon = item.icon;
            return <Button key={item.id} type="button" variant="ghost" onClick={() => { setTool(item.id); setSelection(null); setDragStart(null); }} className={cn("h-full min-w-20 shrink-0 flex-col gap-2 rounded-none px-3 text-xs text-editor-muted", tool === item.id && "border-t-2 border-primary text-primary")}><Icon className="size-6" />{item.label}</Button>;
          })}
        </nav>

        <div className="flex items-center justify-between border-t border-editor-border px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={reset}><Undo2 /> Restablecer</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onDone(file)}>Usar original</Button>
        </div>
      </section>
    </div>
  );
}

function ColorChoices({ value, onChange }: { value: BrushColor; onChange: (value: BrushColor) => void }) {
  const colors: BrushColor[] = ["fail", "warn", "primary", "foreground"];
  return <div className="flex shrink-0 gap-1">{colors.map((color) => <button key={color} type="button" aria-label={`Color ${color}`} aria-pressed={value === color} onClick={() => onChange(color)} className={cn("size-7 rounded-full border-2 border-editor-panel ring-offset-2 ring-offset-editor-panel", `bg-${color}`, value === color && "ring-2 ring-primary")} />)}</div>;
}

function DrawingControls({ color, setColor, width, setWidth, onUndo }: { color: BrushColor; setColor: (value: BrushColor) => void; width: number; setWidth: (value: number) => void; onUndo: () => void }) {
  return <div className="flex items-center gap-3"><ColorChoices value={color} onChange={setColor} /><label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-editor-muted">Grosor<input type="range" min="2" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="min-w-0 flex-1 accent-primary" /></label><Button type="button" variant="ghost" size="icon" onClick={onUndo} aria-label="Deshacer último trazo"><Undo2 /></Button></div>;
}
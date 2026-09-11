import { useEffect, useRef, useState } from "react";
import { RotateCw, Check, X, Wand2, Scissors, Undo2 } from "lucide-react";

type Rect = { x: number; y: number; w: number; h: number };

type Props = {
  file: File;
  index: number;
  total: number;
  onDone: (file: File) => void;
  onCancel: () => void;
};

const MAX_PREVIEW = 900;

function rotatedSize(w: number, h: number, rot: number) {
  return rot % 180 === 0 ? { w, h } : { w: h, h: w };
}

function drawRotated(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rot: number,
  scale: number,
  filter: string,
) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  ctx.clearRect(0, 0, cw, ch);
  ctx.save();
  ctx.filter = filter;
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(
    img,
    (-img.width * scale) / 2,
    (-img.height * scale) / 2,
    img.width * scale,
    img.height * scale,
  );
  ctx.restore();
}

export function PhotoEditor({ file, index, total, onDone, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [rot, setRot] = useState(0);
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [saturacion, setSaturacion] = useState(100);
  const [sel, setSel] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const filtro = `brightness(${brillo}%) contrast(${contraste}%) saturate(${saturacion}%)`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const r = rotatedSize(img.width, img.height, rot);
    const scale = Math.min(1, MAX_PREVIEW / Math.max(r.w, r.h));
    canvas.width = Math.round(r.w * scale);
    canvas.height = Math.round(r.h * scale);
    const ctx = canvas.getContext("2d")!;
    drawRotated(ctx, img, rot, scale, filtro);
  }, [img, rot, filtro]);

  function pos(e: React.PointerEvent) {
    const el = wrapRef.current!;
    const b = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)),
      y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)),
    };
  }

  function onDown(e: React.PointerEvent) {
    const p = pos(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag(p);
    setSel({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    const p = pos(e);
    setSel({
      x: Math.min(drag.x, p.x),
      y: Math.min(drag.y, p.y),
      w: Math.abs(p.x - drag.x),
      h: Math.abs(p.y - drag.y),
    });
  }
  function onUp() {
    setDrag(null);
    setSel((s) => (s && s.w > 0.03 && s.h > 0.03 ? s : null));
  }

  function autoMejorar() {
    setBrillo(110);
    setContraste(120);
    setSaturacion(110);
  }

  function resetear() {
    setRot(0);
    setBrillo(100);
    setContraste(100);
    setSaturacion(100);
    setSel(null);
  }

  async function aplicar() {
    if (!img) return;
    setGuardando(true);
    try {
      const r = rotatedSize(img.width, img.height, rot);
      const full = document.createElement("canvas");
      full.width = r.w;
      full.height = r.h;
      drawRotated(full.getContext("2d")!, img, rot, 1, filtro);

      let out = full;
      if (sel) {
        const sx = Math.round(sel.x * r.w);
        const sy = Math.round(sel.y * r.h);
        const sw = Math.max(1, Math.round(sel.w * r.w));
        const sh = Math.max(1, Math.round(sel.h * r.h));
        const c = document.createElement("canvas");
        c.width = sw;
        c.height = sh;
        c.getContext("2d")!.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
        out = c;
      }

      const blob: Blob = await new Promise((res) =>
        out.toBlob((b) => res(b!), "image/jpeg", 0.9),
      );
      onDone(
        new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }),
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <p className="text-xs font-semibold">
          Editar foto {index + 1} de {total}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 px-2 text-muted-foreground"
          aria-label="Cancelar edición"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto grid place-items-center p-3">
        <div
          ref={wrapRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="relative touch-none select-none inline-block"
        >
          <canvas ref={canvasRef} className="max-w-full h-auto rounded-md block" />
          {sel && (
            <div
              className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
              style={{
                left: `${sel.x * 100}%`,
                top: `${sel.y * 100}%`,
                width: `${sel.w * 100}%`,
                height: `${sel.h * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      <div className="border-t border-border p-3 space-y-3">
        <p className="text-[11px] text-muted-foreground">
          Arrastre sobre la imagen para seleccionar el área a recortar.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRot((r) => (r + 90) % 360)}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface-1 border border-border text-xs font-semibold"
          >
            <RotateCw className="size-3.5" /> Girar
          </button>
          <button
            type="button"
            onClick={autoMejorar}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface-1 border border-border text-xs font-semibold"
          >
            <Wand2 className="size-3.5" /> Mejorar
          </button>
          <button
            type="button"
            onClick={() => setSel(null)}
            disabled={!sel}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface-1 border border-border text-xs font-semibold disabled:opacity-40"
          >
            <Scissors className="size-3.5" /> Quitar recorte
          </button>
          <button
            type="button"
            onClick={resetear}
            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg bg-surface-1 border border-border text-xs font-semibold"
          >
            <Undo2 className="size-3.5" /> Restablecer
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            ["Brillo", brillo, setBrillo],
            ["Contraste", contraste, setContraste],
            ["Color", saturacion, setSaturacion],
          ] as const).map(([label, val, set]) => (
            <label key={label} className="text-[10px] text-muted-foreground space-y-1">
              {label}
              <input
                type="range"
                min={50}
                max={180}
                value={val}
                onChange={(e) => set(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={aplicar}
            disabled={!img || guardando}
            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
          >
            <Check className="size-4" /> Usar foto
          </button>
          <button
            type="button"
            onClick={() => onDone(file)}
            className="min-h-11 px-3 rounded-lg border border-border text-xs font-semibold"
          >
            Sin editar
          </button>
        </div>
      </div>
    </div>
  );
}

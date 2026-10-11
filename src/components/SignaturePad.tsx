"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Parmakla/kalemle imza alanı. İmza PNG data URL olarak döner. */
export function SignaturePad(props: { value?: string; onChange: (dataUrl: string | undefined) => void; height?: number; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(!props.value);
  const h = props.height ?? 160;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const w = c.parentElement?.clientWidth ?? 400;
    c.width = w * ratio;
    c.height = h * ratio;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1b2a4a";
    if (props.value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = props.value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: React.PointerEvent) {
    if (props.disabled) return;
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setEmpty(false);
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    props.onChange(ref.current!.toDataURL("image/png"));
  }
  function clear() {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    props.onChange(undefined);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-navy-200 bg-white">
        <canvas ref={ref} className="block touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        {empty && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-navy-300">Parmağınızla buraya imzalayın</div>}
      </div>
      {!props.disabled && (
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={clear}>
          <Eraser size={16} /> Temizle
        </button>
      )}
    </div>
  );
}

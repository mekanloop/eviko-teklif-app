"use client";

import { useRef, useState } from "react";
import { acilimSegment, clampOge, odaCm, ogeBoyut, snap } from "@/lib/engine/plan";
import type { Mekan, PlanAcilim, PlanOge, PlanOgeTuru } from "@/lib/types";

const RENK: Record<PlanOgeTuru, { fill: string; stroke: string }> = {
  klozet: { fill: "#e4ecf8", stroke: "#44608f" },
  lavabo: { fill: "#e4ecf8", stroke: "#44608f" },
  dusakabin: { fill: "#dff1f5", stroke: "#2f7f93" },
  kuvet: { fill: "#e4ecf8", stroke: "#44608f" },
  camasir: { fill: "#eef0f4", stroke: "#6b7690" },
  havlu: { fill: "#f2e8d5", stroke: "#957244" },
  dolap: { fill: "#f2e8d5", stroke: "#957244" },
  diger: { fill: "#eef0f4", stroke: "#6b7690" },
};

function Acilim({ a, W, H, ek }: { a: PlanAcilim; W: number; H: number; ek: number }) {
  const s = acilimSegment(a, W, H);
  const g = a.genislik;
  const yatay = a.duvar === "ust" || a.duvar === "alt";
  if (a.tip === "pencere") {
    const d = ek * 0.6;
    return (
      <g stroke="#2f7f93" strokeWidth={ek * 0.35}>
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#fff" strokeWidth={ek * 2.4} />
        {yatay ? (
          <>
            <line x1={s.x1} y1={s.y1 - d} x2={s.x2} y2={s.y2 - d} />
            <line x1={s.x1} y1={s.y1 + d} x2={s.x2} y2={s.y2 + d} />
          </>
        ) : (
          <>
            <line x1={s.x1 - d} y1={s.y1} x2={s.x2 - d} y2={s.y2} />
            <line x1={s.x1 + d} y1={s.y1} x2={s.x2 + d} y2={s.y2} />
          </>
        )}
      </g>
    );
  }
  if (a.tip === "surgulu") {
    return (
      <g>
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#fff" strokeWidth={ek * 2.4} />
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#957244" strokeWidth={ek * 0.5} strokeDasharray={`${ek * 1.5} ${ek}`} />
      </g>
    );
  }
  // Kapı: duvarda boşluk + iç yöne açılan kanat ve yay
  let leaf = "";
  let arc = "";
  switch (a.duvar) {
    case "ust": leaf = `M ${s.x1} 0 L ${s.x1} ${g}`; arc = `M ${s.x2} 0 A ${g} ${g} 0 0 1 ${s.x1} ${g}`; break;
    case "alt": leaf = `M ${s.x1} ${H} L ${s.x1} ${H - g}`; arc = `M ${s.x2} ${H} A ${g} ${g} 0 0 0 ${s.x1} ${H - g}`; break;
    case "sol": leaf = `M 0 ${s.y1} L ${g} ${s.y1}`; arc = `M 0 ${s.y2} A ${g} ${g} 0 0 0 ${g} ${s.y1}`; break;
    default: leaf = `M ${W} ${s.y1} L ${W - g} ${s.y1}`; arc = `M ${W} ${s.y2} A ${g} ${g} 0 0 1 ${W - g} ${s.y1}`;
  }
  return (
    <g>
      <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#fff" strokeWidth={ek * 2.4} />
      <path d={leaf} stroke="#1b2a4a" strokeWidth={ek * 0.5} fill="none" />
      <path d={arc} stroke="#94a8c8" strokeWidth={ek * 0.3} strokeDasharray={`${ek * 0.8} ${ek * 0.8}`} fill="none" />
    </g>
  );
}

function OgeSekli({ o, bw, bh, ek }: { o: PlanOge; bw: number; bh: number; ek: number }) {
  const c = RENK[o.tur];
  const r = o.tur === "kuvet" ? Math.min(bw, bh) * 0.3 : o.tur === "lavabo" ? Math.min(bw, bh) * 0.15 : ek * 0.4;
  return (
    <g>
      <rect width={bw} height={bh} rx={r} fill={c.fill} stroke={c.stroke} strokeWidth={ek * 0.5} />
      {o.tur === "dusakabin" && <line x1={0} y1={0} x2={bw} y2={bh} stroke={c.stroke} strokeWidth={ek * 0.3} strokeDasharray={`${ek} ${ek}`} />}
      {o.tur === "klozet" && <ellipse cx={bw / 2} cy={bh * 0.62} rx={bw * 0.38} ry={bh * 0.3} fill="#fff" stroke={c.stroke} strokeWidth={ek * 0.3} />}
      {o.tur === "lavabo" && <ellipse cx={bw / 2} cy={bh / 2} rx={bw * 0.34} ry={bh * 0.3} fill="#fff" stroke={c.stroke} strokeWidth={ek * 0.3} />}
      {o.tur === "dolap" && (
        <>
          <line x1={0} y1={0} x2={bw} y2={bh} stroke={c.stroke} strokeWidth={ek * 0.25} />
          <line x1={bw} y1={0} x2={0} y2={bh} stroke={c.stroke} strokeWidth={ek * 0.25} />
        </>
      )}
    </g>
  );
}

/**
 * Mekan krokisi (üstten plan). Birim cm.
 * `interactive` ise öğeler parmakla/fareyle sürüklenebilir (5 cm'e yapışır).
 */
export function Kroki(props: {
  mekan: Mekan;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  interactive?: boolean;
  etiketler?: Record<string, string>;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  className?: string;
}) {
  const { mekan } = props;
  const { W, H } = odaCm(mekan);
  const ownRef = useRef<SVGSVGElement | null>(null);
  const svgRef = props.svgRef ?? ownRef;
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; x: number; y: number } | null>(null);

  if (W <= 0 || H <= 0) return <div className="p-6 text-center text-sm text-navy-400">Kroki için mekanın en ve boy ölçüsü gerekli.</div>;

  const pad = Math.max(50, Math.round(Math.max(W, H) * 0.14));
  const ek = Math.max(2.2, Math.max(W, H) / 150); // çizgi ölçeği
  const fs = Math.max(9, Math.max(W, H) / 32); // yazı boyutu

  function pt(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const m = svg.getScreenCTM()!.inverse();
    const q = p.matrixTransform(m);
    return { x: q.x, y: q.y };
  }

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`}
      className={props.className}
      style={{ touchAction: props.interactive ? "none" : undefined, background: "#fff", fontFamily: "Helvetica, Arial, sans-serif" }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) props.onSelect?.(null); }}
      onPointerMove={(e) => {
        if (!drag) return;
        const p = pt(e);
        setDrag({ ...drag, x: p.x - drag.dx, y: p.y - drag.dy });
      }}
      onPointerUp={() => {
        if (!drag) return;
        const o = (mekan.ogeler ?? []).find((x) => x.id === drag.id);
        if (o) {
          const c = clampOge({ ...o, x: snap(drag.x), y: snap(drag.y) }, W, H);
          props.onMove?.(o.id, c.x, c.y);
        }
        setDrag(null);
      }}
    >
      <rect x={-pad} y={-pad} width={W + pad * 2} height={H + pad * 2} fill="#fff" />
      {/* ızgara (50 cm) */}
      <g stroke="#e6ebf3" strokeWidth={ek * 0.15}>
        {Array.from({ length: Math.floor(W / 50) + 1 }).map((_, i) => <line key={`gx${i}`} x1={i * 50} y1={0} x2={i * 50} y2={H} />)}
        {Array.from({ length: Math.floor(H / 50) + 1 }).map((_, i) => <line key={`gy${i}`} x1={0} y1={i * 50} x2={W} y2={i * 50} />)}
      </g>
      <rect x={0} y={0} width={W} height={H} fill="#fbfcfe" fillOpacity={0.6} stroke="#1b2a4a" strokeWidth={ek * 1.8} />

      {(mekan.acilimlar ?? []).map((a) => <Acilim key={a.id} a={a} W={W} H={H} ek={ek} />)}

      {(mekan.ogeler ?? []).map((o) => {
        const b = ogeBoyut(o);
        const pos = drag && drag.id === o.id ? { x: Math.min(Math.max(0, drag.x), W - b.w), y: Math.min(Math.max(0, drag.y), H - b.h) } : { x: o.x, y: o.y };
        const sel = props.selectedId === o.id;
        const etiket = props.etiketler?.[o.id] ?? o.ad;
        return (
          <g
            key={o.id}
            transform={`translate(${pos.x} ${pos.y})`}
            style={{ cursor: props.interactive ? "grab" : undefined }}
            onPointerDown={(e) => {
              if (!props.interactive) return;
              e.stopPropagation();
              (e.currentTarget as SVGGElement).ownerSVGElement!.setPointerCapture(e.pointerId);
              const p = pt(e);
              props.onSelect?.(o.id);
              setDrag({ id: o.id, dx: p.x - o.x, dy: p.y - o.y, x: o.x, y: o.y });
            }}
          >
            {/* Döndürme: şekil kendi merkezi etrafında */}
            <g transform={o.rot === 0 ? undefined : `translate(${b.w / 2} ${b.h / 2}) rotate(${o.rot}) translate(${-o.w / 2} ${-o.h / 2})`}>
              <OgeSekli o={o} bw={o.w} bh={o.h} ek={ek} />
            </g>
            {sel && <rect x={-ek} y={-ek} width={b.w + ek * 2} height={b.h + ek * 2} fill="none" stroke="#b08d57" strokeWidth={ek * 0.8} strokeDasharray={`${ek * 2} ${ek}`} />}
            <text x={b.w / 2} y={b.h / 2 - fs * 0.1} textAnchor="middle" fontSize={fs * 0.85} fontWeight={700} fill="#1b2a4a">{etiket}</text>
            <text x={b.w / 2} y={b.h / 2 + fs * 0.95} textAnchor="middle" fontSize={fs * 0.7} fill="#44608f">{b.w}×{b.h}</text>
          </g>
        );
      })}

      {/* ölçü çizgileri */}
      <g stroke="#6580ad" strokeWidth={ek * 0.35} fill="#44608f" fontSize={fs}>
        <line x1={0} y1={-pad * 0.55} x2={W} y2={-pad * 0.55} />
        <line x1={0} y1={-pad * 0.55 - ek * 2} x2={0} y2={-pad * 0.55 + ek * 2} />
        <line x1={W} y1={-pad * 0.55 - ek * 2} x2={W} y2={-pad * 0.55 + ek * 2} />
        <text x={W / 2} y={-pad * 0.55 - ek * 2.5} textAnchor="middle" stroke="none" fontWeight={700}>{W} cm</text>
        <line x1={-pad * 0.55} y1={0} x2={-pad * 0.55} y2={H} />
        <line x1={-pad * 0.55 - ek * 2} y1={0} x2={-pad * 0.55 + ek * 2} y2={0} />
        <line x1={-pad * 0.55 - ek * 2} y1={H} x2={-pad * 0.55 + ek * 2} y2={H} />
        <text x={-pad * 0.55 - ek * 2.5} y={H / 2} textAnchor="middle" stroke="none" fontWeight={700} transform={`rotate(-90 ${-pad * 0.55 - ek * 2.5} ${H / 2})`}>{H} cm</text>
      </g>
      <text x={W / 2} y={H + pad * 0.62} textAnchor="middle" fontSize={fs * 0.85} fill="#6580ad">{mekan.ad} · Plan ölçeksizdir, ölçüler cm</text>
    </svg>
  );
}

/** SVG'yi PNG'ye çevirir (ChatGPT'ye referans görsel olarak eklemek için). */
export async function svgToPngBlob(svg: SVGSVGElement, pikselGenislik = 1600): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const oran = vb.height / vb.width;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(pikselGenislik));
  clone.setAttribute("height", String(Math.round(pikselGenislik * oran)));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Görsel oluşturulamadı"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = pikselGenislik;
    canvas.height = Math.round(pikselGenislik * oran);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG üretilemedi"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

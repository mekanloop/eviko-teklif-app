"use client";

import { Download, RotateCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Kroki, svgToPngBlob } from "./Kroki";
import { Field, Modal, NumField, Select, TextInput, cx } from "./ui";
import { uid } from "@/lib/db/ids";
import { OGE_VARSAYILAN, clampOge, odaCm, yeniOge } from "@/lib/engine/plan";
import { DUVAR_ETIKET, PLAN_OGE_ETIKET, type DuvarYonu, type Mekan, type PlanAcilim, type PlanOge, type PlanOgeTuru } from "@/lib/types";

const OGE_TURLERI = (Object.keys(PLAN_OGE_ETIKET) as PlanOgeTuru[]).filter((t) => t !== "dolap");
const DUVARLAR = (Object.keys(DUVAR_ETIKET) as DuvarYonu[]).map((v) => ({ value: v, label: DUVAR_ETIKET[v] }));
const ACILIM_TIP = { kapi: "Kapı", pencere: "Pencere", surgulu: "Gömme/sürgülü kapı" } as const;

export function KrokiEditor(props: { mekan: Mekan; readOnly: boolean; onChange: (fn: (m: Mekan) => void) => void; onClose: () => void }) {
  const { mekan, readOnly } = props;
  const { W, H } = odaCm(mekan);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const ogeler = mekan.ogeler ?? [];
  const acilimlar = mekan.acilimlar ?? [];
  const secili = ogeler.find((o) => o.id === sel);
  const dolapEtiket = Object.fromEntries((mekan.dolaplar ?? []).map((d) => [d.id, d.ad]));
  const etiketler: Record<string, string> = {};
  for (const o of ogeler) if (o.dolapId && dolapEtiket[o.dolapId]) etiketler[o.id] = dolapEtiket[o.dolapId];

  const editOge = (id: string, fn: (o: PlanOge) => void) =>
    props.onChange((m) => {
      const o = (m.ogeler ?? []).find((x) => x.id === id);
      if (o) {
        fn(o);
        Object.assign(o, clampOge(o, W, H));
      }
    });

  async function pngIndir() {
    try {
      setHata(null);
      const blob = await svgToPngBlob(svgRef.current!);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `kroki-${mekan.ad.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
    } catch (e) {
      setHata(e instanceof Error ? e.message : String(e));
    }
  }

  const dolapBagsiz = (mekan.dolaplar ?? []).filter((d) => !ogeler.some((o) => o.dolapId === d.id));

  return (
    <Modal
      xl
      title={`Kroki — ${mekan.ad}`}
      onClose={props.onClose}
      footer={
        <>
          {hata && <span className="mr-auto self-center text-sm text-red-600">{hata}</span>}
          <button className="btn btn-ghost" onClick={pngIndir}><Download size={16} /> PNG indir (ChatGPT'ye ekle)</button>
          <button className="btn btn-primary" onClick={props.onClose}>Kapat</button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-xl border border-navy-100 bg-white">
            <Kroki mekan={mekan} interactive={!readOnly} selectedId={sel} onSelect={setSel} etiketler={etiketler} svgRef={svgRef} className="block h-auto max-h-[62vh] w-full" onMove={(id, x, y) => editOge(id, (o) => { o.x = x; o.y = y; })} />
          </div>
          <p className="mt-2 text-xs text-navy-400">Öğeleri parmakla sürükleyin (5 cm'e yapışır). Oda ölçüsü teklifteki en × boy'dan gelir ({W} × {H} cm).</p>
        </div>

        <div className="space-y-4">
          {!readOnly && (
            <div>
              <div className="label">Öğe ekle</div>
              <div className="flex flex-wrap gap-1.5">
                {OGE_TURLERI.map((t) => (
                  <button key={t} className="btn btn-ghost btn-sm" onClick={() => props.onChange((m) => { const o = yeniOge(t, W, H, uid); m.ogeler = [...(m.ogeler ?? []), o]; setSel(o.id); })}>+ {PLAN_OGE_ETIKET[t]}</button>
                ))}
              </div>
              {dolapBagsiz.length > 0 && (
                <div className="mt-2">
                  <div className="label">Dolabı krokiye yerleştir</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dolapBagsiz.map((d) => (
                      <button key={d.id} className="btn btn-accent btn-sm" onClick={() => props.onChange((m) => { const o = yeniOge("dolap", W, H, uid, { ad: d.ad, w: d.genislik, h: d.derinlik, dolapId: d.id }); m.ogeler = [...(m.ogeler ?? []), o]; setSel(o.id); })}>+ {d.ad}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {secili && (
            <div className="rounded-xl border border-bronze-300 bg-bronze-50/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-bold text-navy-800">{PLAN_OGE_ETIKET[secili.tur]} seçili</div>
                {!readOnly && (
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => editOge(secili.id, (o) => (o.rot = (((o.rot + 90) % 360) as PlanOge["rot"])))}><RotateCw size={16} /> 90°</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { props.onChange((m) => (m.ogeler = (m.ogeler ?? []).filter((x) => x.id !== secili.id))); setSel(null); }}><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Ad" className="col-span-2"><TextInput disabled={readOnly || !!secili.dolapId} value={etiketler[secili.id] ?? secili.ad} onChange={(v) => editOge(secili.id, (o) => (o.ad = v))} /></Field>
                <Field label="Soldan (cm)"><NumField disabled={readOnly} value={secili.x} onChange={(v) => editOge(secili.id, (o) => (o.x = v ?? 0))} /></Field>
                <Field label="Üstten (cm)"><NumField disabled={readOnly} value={secili.y} onChange={(v) => editOge(secili.id, (o) => (o.y = v ?? 0))} /></Field>
                <Field label="Genişlik (cm)"><NumField disabled={readOnly || !!secili.dolapId} value={secili.w} onChange={(v) => editOge(secili.id, (o) => (o.w = v ?? OGE_VARSAYILAN[o.tur].w))} /></Field>
                <Field label="Derinlik (cm)"><NumField disabled={readOnly || !!secili.dolapId} value={secili.h} onChange={(v) => editOge(secili.id, (o) => (o.h = v ?? OGE_VARSAYILAN[o.tur].h))} /></Field>
              </div>
              {secili.dolapId && <p className="mt-2 text-xs text-navy-500">Dolabın ölçüsü teklifteki Dolaplar bölümünden gelir.</p>}
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="label !mb-0">Kapı / pencere</div>
              {!readOnly && (
                <div className="flex gap-1">
                  {(Object.keys(ACILIM_TIP) as Array<PlanAcilim["tip"]>).map((t) => (
                    <button key={t} className="btn btn-ghost btn-sm" onClick={() => props.onChange((m) => (m.acilimlar = [...(m.acilimlar ?? []), { id: uid(), tip: t, duvar: "alt", ofset: 20, genislik: t === "pencere" ? 100 : 80 }]))}>+ {ACILIM_TIP[t]}</button>
                  ))}
                </div>
              )}
            </div>
            {acilimlar.length === 0 && <div className="rounded-lg bg-navy-50 p-3 text-sm text-navy-400">Kapı veya pencere eklenmedi.</div>}
            <div className="space-y-2">
              {acilimlar.map((a) => (
                <div key={a.id} className={cx("grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-xl border border-navy-100 p-2")}>
                  <Field label={ACILIM_TIP[a.tip]}>
                    <Select disabled={readOnly} value={a.duvar} onChange={(v) => props.onChange((m) => { const x = (m.acilimlar ?? []).find((y) => y.id === a.id); if (x) x.duvar = v; })} options={DUVARLAR} />
                  </Field>
                  <Field label={a.duvar === "ust" || a.duvar === "alt" ? "Soldan cm" : "Üstten cm"}><NumField disabled={readOnly} value={a.ofset} onChange={(v) => props.onChange((m) => { const x = (m.acilimlar ?? []).find((y) => y.id === a.id); if (x) x.ofset = v ?? 0; })} /></Field>
                  <Field label="Genişlik cm"><NumField disabled={readOnly} value={a.genislik} onChange={(v) => props.onChange((m) => { const x = (m.acilimlar ?? []).find((y) => y.id === a.id); if (x) x.genislik = v ?? 0; })} /></Field>
                  {!readOnly && <button className="btn btn-danger btn-sm !px-2" onClick={() => props.onChange((m) => (m.acilimlar = (m.acilimlar ?? []).filter((y) => y.id !== a.id)))}><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

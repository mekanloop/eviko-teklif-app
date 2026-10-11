"use client";

import { Check, Copy, Download } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Kroki, svgToPngBlob } from "./Kroki";
import { Field, Modal, Select, TextArea, cx } from "./ui";
import { aciPromptlari, masterSartname, VARSAYILAN_STIL, type PromptDili } from "@/lib/engine/prompt";
import type { Cabinet, Mekan, Product } from "@/lib/types";

async function kopyala(metin: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(metin);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = metin;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(t);
    return ok;
  }
}

function KopyaDugmesi({ metin, etiket = "Kopyala", className }: { metin: string; etiket?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className={cx("btn btn-ghost btn-sm", className)}
      onClick={async () => {
        if (await kopyala(metin)) {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        }
      }}
    >
      {ok ? <><Check size={16} /> Kopyalandı</> : <><Copy size={16} /> {etiket}</>}
    </button>
  );
}

export function PromptModal(props: { mekanlar: Mekan[]; products: Product[]; cabinets: Cabinet[]; onClose: () => void }) {
  const [mekanId, setMekanId] = useState(props.mekanlar[0]?.id ?? "");
  const [dil, setDil] = useState<PromptDili>("en");
  const [stil, setStil] = useState(VARSAYILAN_STIL.en);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mekan = props.mekanlar.find((m) => m.id === mekanId);
  const urunler = useMemo(() => Object.fromEntries(props.products.map((p) => [p.id, p])), [props.products]);
  const dolapKatalogu = useMemo(() => Object.fromEntries(props.cabinets.map((c) => [c.id, c])), [props.cabinets]);

  const girdi = mekan ? { mekan, urunler, dolapKatalogu, dil, stil } : null;
  const master = girdi ? masterSartname(girdi) : "";
  const acilar = girdi ? aciPromptlari(girdi) : [];

  function dilDegis(d: PromptDili) {
    // Stil metni hâlâ varsayılansa yeni dile çevir
    if (stil === VARSAYILAN_STIL[dil]) setStil(VARSAYILAN_STIL[d]);
    setDil(d);
  }

  async function pngIndir() {
    const blob = await svgToPngBlob(svgRef.current!);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kroki-${(mekan?.ad ?? "mekan").replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  return (
    <Modal xl title="ChatGPT görsel promptu" onClose={props.onClose} footer={<button className="btn btn-primary" onClick={props.onClose}>Kapat</button>}>
      {props.mekanlar.length === 0 || !mekan ? (
        <div className="p-6 text-center text-sm text-navy-500">Önce teklifte bir mekan ekleyin.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <Field label="Mekan"><Select value={mekanId} onChange={setMekanId} options={props.mekanlar.map((m) => ({ value: m.id, label: m.ad }))} /></Field>
            <Field label="Prompt dili">
              <div className="flex gap-2">
                {(["en", "tr"] as const).map((d) => (
                  <button key={d} onClick={() => dilDegis(d)} className={cx("min-h-[44px] flex-1 rounded-xl text-sm font-semibold", dil === d ? "bg-navy-800 text-white" : "bg-navy-100 text-navy-600")}>{d === "en" ? "English (önerilen)" : "Türkçe"}</button>
                ))}
              </div>
            </Field>
            <Field label="Stil / ışık / kamera notları" hint="Her açı promptuna eklenir"><TextArea rows={5} value={stil} onChange={setStil} /></Field>
            <div>
              <div className="label">Referans kroki</div>
              <div className="overflow-hidden rounded-xl border border-navy-100"><Kroki mekan={mekan} svgRef={svgRef} className="block h-auto w-full" /></div>
              <button className="btn btn-ghost btn-sm mt-2 w-full" onClick={pngIndir}><Download size={16} /> Krokiyi PNG indir</button>
            </div>
            <div className="rounded-xl border border-bronze-200 bg-bronze-50 p-3 text-xs text-bronze-700">
              <b>Tutarlı sonuç için:</b> ChatGPT'de yeni bir sohbet açın, önce <b>kroki PNG</b>'sini ve varsa dolap/seramik fotoğraflarını yükleyin, sonra aşağıdaki açı promptlarını <b>aynı sohbette</b> sırayla yapıştırın. Her prompt ana şartnameyi içerir.
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-bold text-navy-800">Ana şartname</div>
                <KopyaDugmesi metin={master} />
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-navy-50 p-3 text-xs leading-relaxed text-navy-700">{master}</pre>
            </div>
            <div className="card p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-bold text-navy-800">Açı promptları (her biri tam, kopyala-yapıştır)</div>
                <KopyaDugmesi metin={acilar.map((a) => `### ${a.baslik}\n${a.prompt}`).join("\n\n----------\n\n")} etiket="Hepsini kopyala" />
              </div>
              <div className="space-y-2">
                {acilar.map((a) => (
                  <details key={a.baslik} className="rounded-lg border border-navy-100">
                    <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-navy-700">
                      <span>{a.baslik}</span>
                    </summary>
                    <div className="border-t border-navy-100 p-3">
                      <div className="mb-2 flex justify-end"><KopyaDugmesi metin={a.prompt} /></div>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-navy-50 p-3 text-xs leading-relaxed text-navy-700">{a.prompt}</pre>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

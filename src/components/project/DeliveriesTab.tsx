"use client";

import { FileDown, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Empty, Field, Modal, TextArea, TextInput, Toggle } from "@/components/ui";
import { SignaturePad } from "@/components/SignaturePad";
import { getDb } from "@/lib/db/schema";
import { todayIso, uid } from "@/lib/db/ids";
import { useDeliveries, useHandovers } from "@/lib/data/hooks";
import { formatSayi } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import { BIRIM_ETIKET, type Delivery, type DeliveryRow, type Handover, type HandoverRow } from "@/lib/types";
import type { ProjectCtx } from "./ProjectContext";

function malSatirlari(ctx: ProjectCtx): DeliveryRow[] {
  const q = ctx.quote;
  const r = ctx.result;
  if (!q || !r) return [];
  const opt = q.secenekler.find((o) => o.id === q.secilenSecenekId) ?? q.secenekler[0];
  const rows: DeliveryRow[] = [];
  for (const m of opt?.mekanlar ?? []) {
    const mr = r.mekanlar.find((x) => x.id === m.id);
    for (const it of m.kalemler) {
      if (!it.aktif) continue;
      const ir = mr?.kalemler.find((x) => x.id === it.id);
      for (const l of it.satirlar) {
        if (l.kind !== "malzeme") continue;
        // Götürü gider kalemleri (moloz, sarf vb.) teslim edilen mal değildir
        if (l.birim === "goturu" && !l.productId) continue;
        const lr = ir?.satirlar.find((x) => x.id === l.id);
        const urunAd = l.productId ? (q.dondurulmus?.urunler[l.productId]?.ad ?? "") : "";
        const miktar = lr ? `${formatSayi(lr.miktar)} ${BIRIM_ETIKET[l.birim] ?? ""}${lr.kutu ? ` (${lr.kutu} kutu)` : ""}` : "";
        rows.push({ id: uid(), ad: `${m.ad} › ${l.label}${urunAd ? ` — ${urunAd}` : ""}`, miktar, teslimEdildi: false, not: "" });
      }
    }
  }
  return rows;
}

function isSatirlari(ctx: ProjectCtx): HandoverRow[] {
  const q = ctx.quote;
  if (!q) return [];
  const opt = q.secenekler.find((o) => o.id === q.secilenSecenekId) ?? q.secenekler[0];
  const rows: HandoverRow[] = [];
  for (const m of opt?.mekanlar ?? []) for (const it of m.kalemler) if (it.aktif) rows.push({ id: uid(), ad: `${m.ad} › ${it.ad}`, tamam: true, not: "" });
  return rows;
}

export function DeliveriesTab({ ctx }: { ctx: ProjectCtx }) {
  const mal = useDeliveries(ctx.project.id);
  const isT = useHandovers(ctx.project.id);
  const [md, setMd] = useState<Delivery | null>(null);
  const [hd, setHd] = useState<Handover | null>(null);
  if (!mal || !isT) return null;

  const yeniMal = (): Delivery => ({ id: uid(), projectId: ctx.project.id, tarih: todayIso(), teslimAlan: ctx.customer?.ad ?? "", satirlar: malSatirlari(ctx), not: "" });
  const yeniIs = (): Handover => ({ id: uid(), projectId: ctx.project.id, tarih: todayIso(), teslimAlan: ctx.customer?.ad ?? "", satirlar: isSatirlari(ctx), eksikler: "", not: "" });

  return (
    <div className="space-y-8">
      {/* Mal teslim */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-navy-800">Mal teslim formları</h3>
            <p className="text-sm text-navy-500">Onaylı teklifteki malzemelerin müşteriye / şantiyeye teslimi.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setMd(yeniMal())}><Plus size={16} /> Yeni form</button>
        </div>
        {mal.length === 0 ? <Empty title="Mal teslim formu yok" sub={ctx.quote ? "Yeni form onaylı teklifteki malzemeleri otomatik listeler." : "Önce bir teklif onaylayın; form malzemeleri tekliften alır."} /> : (
          <div className="card divide-y divide-navy-50">
            {mal.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setMd(d)}>
                  <div className="font-semibold text-navy-800">{formatTarih(d.tarih)} · {d.teslimAlan || "Teslim alan belirtilmemiş"}</div>
                  <div className="text-sm text-navy-400">{d.satirlar.filter((s) => s.teslimEdildi).length}/{d.satirlar.length} kalem teslim edildi</div>
                </button>
                {d.imza ? <Badge tone="green">İmzalı</Badge> : <Badge tone="amber">İmza yok</Badge>}
                <Link href={`/projeler/${ctx.project.id}/belge/mal-teslim/${d.id}`} className="btn btn-ghost btn-sm"><FileDown size={16} /> Form</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* İş teslim */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-navy-800">İş teslim tutanakları</h3>
            <p className="text-sm text-navy-500">İş bitince kalemler kontrol edilir, müşteri imzalar.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setHd(yeniIs())}><Plus size={16} /> Yeni tutanak</button>
        </div>
        {isT.length === 0 ? <Empty title="İş teslim tutanağı yok" /> : (
          <div className="card divide-y divide-navy-50">
            {isT.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setHd(d)}>
                  <div className="font-semibold text-navy-800">{formatTarih(d.tarih)} · {d.teslimAlan || "Teslim alan belirtilmemiş"}</div>
                  <div className="text-sm text-navy-400">{d.satirlar.filter((s) => s.tamam).length}/{d.satirlar.length} kalem tamam{d.eksikler ? " · eksik notu var" : ""}</div>
                </button>
                {d.imza ? <Badge tone="green">İmzalı</Badge> : <Badge tone="amber">İmza yok</Badge>}
                <Link href={`/projeler/${ctx.project.id}/belge/is-teslim/${d.id}`} className="btn btn-ghost btn-sm"><FileDown size={16} /> Tutanak</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {md && (
        <Modal
          wide
          title="Mal teslim formu"
          onClose={() => setMd(null)}
          footer={
            <>
              {mal.some((d) => d.id === md.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Form silinsin mi?")) { await getDb().deliveries.delete(md.id); setMd(null); } }}><Trash2 size={16} /></button>}
              <button className="btn btn-ghost" onClick={() => setMd(null)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={async () => { await getDb().deliveries.put(md); setMd(null); }}>Kaydet</button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Teslim tarihi"><TextInput type="date" value={md.tarih} onChange={(v) => setMd({ ...md, tarih: v })} /></Field>
              <Field label="Teslim alan"><TextInput value={md.teslimAlan} onChange={(v) => setMd({ ...md, teslimAlan: v })} /></Field>
            </div>
            <div className="space-y-2">
              {md.satirlar.map((s) => (
                <div key={s.id} className="rounded-xl border border-navy-100 p-2">
                  <div className="flex items-center gap-2">
                    <Toggle checked={s.teslimEdildi} onChange={(v) => setMd({ ...md, satirlar: md.satirlar.map((x) => (x.id === s.id ? { ...x, teslimEdildi: v } : x)) })} />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_160px]">
                      <TextInput value={s.ad} onChange={(v) => setMd({ ...md, satirlar: md.satirlar.map((x) => (x.id === s.id ? { ...x, ad: v } : x)) })} />
                      <TextInput value={s.miktar} onChange={(v) => setMd({ ...md, satirlar: md.satirlar.map((x) => (x.id === s.id ? { ...x, miktar: v } : x)) })} placeholder="Miktar" />
                    </div>
                    <button className="p-2 text-red-600" onClick={() => setMd({ ...md, satirlar: md.satirlar.filter((x) => x.id !== s.id) })} aria-label="Sil"><Trash2 size={16} /></button>
                  </div>
                  <div className="mt-2 pl-14"><TextInput value={s.not} onChange={(v) => setMd({ ...md, satirlar: md.satirlar.map((x) => (x.id === s.id ? { ...x, not: v } : x)) })} placeholder="Kusur / eksik notu" /></div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => setMd({ ...md, satirlar: [...md.satirlar, { id: uid(), ad: "", miktar: "", teslimEdildi: false, not: "" }] })}><Plus size={16} /> Satır ekle</button>
            </div>
            <Field label="Genel not"><TextArea rows={2} value={md.not} onChange={(v) => setMd({ ...md, not: v })} /></Field>
            <div><div className="label">Teslim alan imzası</div><SignaturePad value={md.imza} onChange={(imza) => setMd({ ...md, imza })} /></div>
          </div>
        </Modal>
      )}

      {hd && (
        <Modal
          wide
          title="İş teslim tutanağı"
          onClose={() => setHd(null)}
          footer={
            <>
              {isT.some((d) => d.id === hd.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Tutanak silinsin mi?")) { await getDb().handovers.delete(hd.id); setHd(null); } }}><Trash2 size={16} /></button>}
              <button className="btn btn-ghost" onClick={() => setHd(null)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={async () => { await getDb().handovers.put(hd); setHd(null); }}>Kaydet</button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Teslim tarihi"><TextInput type="date" value={hd.tarih} onChange={(v) => setHd({ ...hd, tarih: v })} /></Field>
              <Field label="Teslim alan"><TextInput value={hd.teslimAlan} onChange={(v) => setHd({ ...hd, teslimAlan: v })} /></Field>
            </div>
            <div className="space-y-2">
              {hd.satirlar.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border border-navy-100 p-2">
                  <Toggle checked={s.tamam} onChange={(v) => setHd({ ...hd, satirlar: hd.satirlar.map((x) => (x.id === s.id ? { ...x, tamam: v } : x)) })} />
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_220px]">
                    <TextInput value={s.ad} onChange={(v) => setHd({ ...hd, satirlar: hd.satirlar.map((x) => (x.id === s.id ? { ...x, ad: v } : x)) })} />
                    <TextInput value={s.not} onChange={(v) => setHd({ ...hd, satirlar: hd.satirlar.map((x) => (x.id === s.id ? { ...x, not: v } : x)) })} placeholder="Not" />
                  </div>
                  <button className="p-2 text-red-600" onClick={() => setHd({ ...hd, satirlar: hd.satirlar.filter((x) => x.id !== s.id) })} aria-label="Sil"><Trash2 size={16} /></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => setHd({ ...hd, satirlar: [...hd.satirlar, { id: uid(), ad: "", tamam: true, not: "" }] })}><Plus size={16} /> Satır ekle</button>
            </div>
            <Field label="Eksik / kusurlar (varsa)"><TextArea rows={2} value={hd.eksikler} onChange={(v) => setHd({ ...hd, eksikler: v })} /></Field>
            <Field label="Genel not"><TextArea rows={2} value={hd.not} onChange={(v) => setHd({ ...hd, not: v })} /></Field>
            <div><div className="label">Teslim alan imzası</div><SignaturePad value={hd.imza} onChange={(imza) => setHd({ ...hd, imza })} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

"use client";

import { ArrowDown, ArrowUp, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { LineEditor } from "@/components/LineEditor";
import { Badge, Empty, Field, Loading, Modal, PageHeader, TextArea, TextInput, Toggle, cx } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { uid } from "@/lib/db/ids";
import { useLabor, useProducts, useTemplates } from "@/lib/data/hooks";
import { MEKAN_ETIKET, type MekanTuru, type WorkTemplate } from "@/lib/types";

const TURLER = Object.keys(MEKAN_ETIKET) as MekanTuru[];

export default function TemplatesPage() {
  const templates = useTemplates();
  const products = useProducts();
  const labor = useLabor();
  const [edit, setEdit] = useState<WorkTemplate | null>(null);

  if (!templates || !products || !labor) return <Loading />;
  const yeni = (): WorkTemplate => ({ id: uid(), ad: "", grup: "Diğer", mekanTurleri: ["banyo"], metin: "", varsayilanAcik: false, satirlar: [], sira: (templates.at(-1)?.sira ?? 0) + 1 });

  async function move(t: WorkTemplate, dir: -1 | 1) {
    const i = templates!.findIndex((x) => x.id === t.id);
    const j = i + dir;
    if (j < 0 || j >= templates!.length) return;
    const a = templates![i];
    const b = templates![j];
    await getDb().transaction("rw", getDb().templates, async () => {
      await getDb().templates.update(a.id, { sira: b.sira });
      await getDb().templates.update(b.id, { sira: a.sira });
    });
  }

  async function save() {
    if (!edit || !edit.ad.trim()) return;
    await getDb().templates.put({ ...edit, ad: edit.ad.trim() });
    setEdit(null);
  }

  return (
    <>
      <PageHeader
        title="İş Kalemi Şablonları"
        sub="Teklifte seçtiğiniz her iş kaleminin maliyet satırları ve müşteriye görünen cümlesi"
        actions={<button className="btn btn-primary" onClick={() => setEdit(yeni())}><Plus size={18} /> Yeni şablon</button>}
      />
      <div className="mb-4 rounded-xl border border-bronze-200 bg-bronze-50 p-3 text-sm text-bronze-700">
        Gün sayıları ve miktarlar başlangıç değerleridir. Kendi tecrübenize göre güncelleyin; her teklifte ayrıca değiştirebilirsiniz. Şablon değişikliği mevcut tekliflere yansımaz.
      </div>
      {templates.length === 0 ? (
        <Empty title="Şablon yok" action={<button className="btn btn-primary" onClick={() => setEdit(yeni())}>Şablon ekle</button>} />
      ) : (
        <div className="card divide-y divide-navy-50">
          {templates.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button disabled={i === 0} className="p-1 text-navy-400 disabled:opacity-20" onClick={() => move(t, -1)} aria-label="Yukarı"><ArrowUp size={16} /></button>
                <button disabled={i === templates.length - 1} className="p-1 text-navy-400 disabled:opacity-20" onClick={() => move(t, 1)} aria-label="Aşağı"><ArrowDown size={16} /></button>
              </div>
              <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(t)}>
                <div className="truncate font-semibold text-navy-800">{t.ad}</div>
                <div className="truncate text-sm text-navy-400">{t.metin || "Müşteri metni yok"}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="bronze">{t.grup}</Badge>
                  {t.mekanTurleri.map((m) => <Badge key={m}>{MEKAN_ETIKET[m]}</Badge>)}
                  <Badge tone={t.varsayilanAcik ? "green" : "gray"}>{t.varsayilanAcik ? "Varsayılan açık" : "Varsayılan kapalı"}</Badge>
                  <Badge>{t.satirlar.length} satır</Badge>
                </div>
              </button>
              <button className="btn btn-ghost btn-sm !px-2" title="Kopyala" onClick={() => getDb().templates.put({ ...t, id: uid(), ad: `${t.ad} (kopya)`, sira: (templates.at(-1)?.sira ?? 0) + 1, satirlar: t.satirlar.map((l) => ({ ...l, id: uid() })) })}><Copy size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <Modal
          wide
          title={templates.some((t) => t.id === edit.id) ? "Şablonu düzenle" : "Yeni şablon"}
          onClose={() => setEdit(null)}
          footer={
            <>
              {templates.some((t) => t.id === edit.id) && (
                <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Şablon silinsin mi? (Mevcut tekliflerdeki kalemler etkilenmez)")) { await getDb().templates.delete(edit.id); setEdit(null); } }}>Sil</button>
              )}
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>Vazgeç</button>
              <button className="btn btn-primary" disabled={!edit.ad.trim()} onClick={save}>Kaydet</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kalem adı"><TextInput value={edit.ad} onChange={(v) => setEdit({ ...edit, ad: v })} /></Field>
              <Field label="Grup"><TextInput value={edit.grup} onChange={(v) => setEdit({ ...edit, grup: v })} placeholder="Söküm, Tesisat, Kaplama…" /></Field>
            </div>
            <Field label="Hangi mekanlarda çıksın">
              <div className="flex flex-wrap gap-2">
                {TURLER.map((m) => {
                  const on = edit.mekanTurleri.includes(m);
                  return <button key={m} type="button" onClick={() => setEdit({ ...edit, mekanTurleri: on ? edit.mekanTurleri.filter((x) => x !== m) : [...edit.mekanTurleri, m] })} className={cx("min-h-[40px] rounded-xl px-4 text-sm font-semibold", on ? "bg-navy-800 text-white" : "bg-navy-100 text-navy-600")}>{MEKAN_ETIKET[m]}</button>;
                })}
              </div>
            </Field>
            <Field label="Müşteriye görünen cümle" hint={"Yer tutucular: {zemin} {duvar} {toplam} {tavan} (m²), {marka} ve {urun} ('Metinde marka/ürün adı geçsin' işaretli satırın tedarikçi ve ürün adı)"}>
              <TextArea rows={3} value={edit.metin} onChange={(v) => setEdit({ ...edit, metin: v })} />
            </Field>
            <Toggle checked={edit.varsayilanAcik} onChange={(v) => setEdit({ ...edit, varsayilanAcik: v })} label="Yeni mekan eklenince varsayılan olarak açık gelsin" />
            <div>
              <div className="label">Maliyet satırları</div>
              <LineEditor lines={edit.satirlar} onChange={(satirlar) => setEdit({ ...edit, satirlar })} products={products} labor={labor} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

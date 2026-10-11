"use client";

import { ArrowDown, ArrowUp, Copy, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { LineEditor } from "@/components/LineEditor";
import { Badge, Empty, Field, Loading, Modal, NumField, TextArea, TextInput, Toggle, cx } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { uid } from "@/lib/db/ids";
import { useCatalog, useLabor, useProducts, useSettings, useTemplates } from "@/lib/data/hooks";
import { itemFromTemplate } from "@/lib/data/quote-ops";
import { calcItem, olculer, type LineResult } from "@/lib/engine/calc";
import { formatSayi, formatTL } from "@/lib/engine/money";
import { MEKAN_ETIKET, type MekanTuru, type WorkTemplate } from "@/lib/types";

const TURLER = Object.keys(MEKAN_ETIKET) as MekanTuru[];
const PRESET: Record<"banyo" | "wc" | "mutfak", { ad: string; en: number; boy: number; yukseklik: number; dusumM2: number }> = {
  banyo: { ad: "Banyo", en: 2, boy: 2.5, yukseklik: 2.6, dusumM2: 2 },
  wc: { ad: "WC", en: 1.2, boy: 1.5, yukseklik: 2.6, dusumM2: 1.6 },
  mutfak: { ad: "Mutfak", en: 3, boy: 3.5, yukseklik: 2.6, dusumM2: 4 },
};

/**
 * Fiyat Listesi > İş kalemleri.
 * Her iş kalemi (elektrik, su tesisatı, seramik…) için: usta türü × gün (yevmiye) + malzeme satırları (fiyat listesinden).
 * Teklifte bu kalemler aç/kapa düğmesiyle eklenir.
 */
export function TemplateManager() {
  const templates = useTemplates();
  const products = useProducts();
  const labor = useLabor();
  const catalog = useCatalog();
  const settings = useSettings();
  const [edit, setEdit] = useState<WorkTemplate | null>(null);
  const [ref, setRef] = useState<keyof typeof PRESET>("banyo");
  const [m, setM] = useState({ ...PRESET.banyo });

  const ayar = useMemo(
    () => ({
      karMalzemeYuzde: settings?.karMalzemeYuzde ?? 25,
      karIscilikYuzde: settings?.karIscilikYuzde ?? 10,
      fireYuzde: settings?.fireYuzde ?? 10,
      yuvarlamaTL: 0,
    }),
    [settings],
  );
  const o = useMemo(() => olculer({ ...m }), [m]);

  const sonuc = (t: WorkTemplate) => (catalog ? calcItem(itemFromTemplate(t), o, catalog, ayar) : undefined);

  if (!templates || !products || !labor || !catalog || !settings) return <Loading />;
  const yeni = (): WorkTemplate => ({ id: uid(), ad: "", grup: "Diğer", mekanTurleri: ["banyo"], metin: "", varsayilanAcik: false, satirlar: [], sira: (templates.at(-1)?.sira ?? 0) + 1 });

  async function move(t: WorkTemplate, dir: -1 | 1) {
    const i = templates!.findIndex((x) => x.id === t.id);
    const j = i + dir;
    if (j < 0 || j >= templates!.length) return;
    const a = templates![i];
    const b = templates![j];
    const db = getDb();
    await db.transaction("rw", db.templates, async () => {
      await db.templates.update(a.id, { sira: b.sira });
      await db.templates.update(b.id, { sira: a.sira });
    });
  }

  async function save() {
    if (!edit || !edit.ad.trim()) return;
    await getDb().templates.put({ ...edit, ad: edit.ad.trim() });
    setEdit(null);
  }

  const editSonuc = edit ? sonuc(edit) : undefined;
  const editResults: Record<string, LineResult> | undefined = editSonuc ? Object.fromEntries(editSonuc.satirlar.map((s) => [s.id, s])) : undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-bronze-200 bg-bronze-50 p-3 text-sm text-bronze-700">
        <b>İş kalemi</b> = bir işin maliyeti: <b>usta türü × gün (yevmiye)</b> + <b>malzeme satırları</b> (yukarıdaki Ürünler listesinden). Örneğin "Elektrik hattı": 1 gün elektrikçi + kablo, priz, anahtar. Teklifte her kalem aç/kapa düğmesiyle eklenir; kalem değişikliği mevcut tekliflere yansımaz.
      </div>

      {/* Örnek ölçü: fiyat önizlemesi */}
      <div className="card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-navy-700">Fiyat önizleme ölçüsü:</span>
          {(Object.keys(PRESET) as Array<keyof typeof PRESET>).map((k) => (
            <button key={k} onClick={() => { setRef(k); setM({ ...PRESET[k] }); }} className={cx("min-h-[36px] rounded-lg px-3 text-sm font-semibold", ref === k ? "bg-navy-800 text-white" : "bg-navy-100 text-navy-600")}>{PRESET[k].ad}</button>
          ))}
          <span className="text-xs text-navy-400">Aşağıdaki fiyatlar bu ölçüye göre hesaplanır (gerçek teklifte mekanın ölçüsü kullanılır).</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="En (m)"><NumField value={m.en} onChange={(v) => setM({ ...m, en: v ?? 0 })} /></Field>
          <Field label="Boy (m)"><NumField value={m.boy} onChange={(v) => setM({ ...m, boy: v ?? 0 })} /></Field>
          <Field label="Yükseklik (m)"><NumField value={m.yukseklik} onChange={(v) => setM({ ...m, yukseklik: v ?? 0 })} /></Field>
          <Field label="Kapı/pencere düşümü"><NumField suffix="m²" value={m.dusumM2} onChange={(v) => setM({ ...m, dusumM2: v ?? 0 })} /></Field>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge tone="blue">Zemin {formatSayi(o.zemin)} m²</Badge>
          <Badge tone="blue">Duvar {formatSayi(o.duvar)} m²</Badge>
          <Badge tone="bronze">Zemin+duvar {formatSayi(o.toplam)} m²</Badge>
          <Badge>Çevre {formatSayi(o.cevre)} mt</Badge>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={() => setEdit(yeni())}><Plus size={18} /> Yeni iş kalemi</button>
      </div>

      {templates.length === 0 ? (
        <Empty title="İş kalemi yok" action={<button className="btn btn-primary" onClick={() => setEdit(yeni())}>İş kalemi ekle</button>} />
      ) : (
        <div className="card divide-y divide-navy-50">
          {templates.map((t, i) => {
            const r = sonuc(t);
            const gun = t.satirlar.filter((l) => l.kind === "iscilik").reduce((a, l) => a + (l.gun ?? 0) * (l.kisi ?? 1), 0);
            const malSay = t.satirlar.filter((l) => l.kind === "malzeme").length;
            return (
              <div key={t.id} className="flex items-center gap-3 px-3 py-3">
                <div className="flex flex-col">
                  <button disabled={i === 0} className="p-1 text-navy-400 disabled:opacity-20" onClick={() => move(t, -1)} aria-label="Yukarı"><ArrowUp size={16} /></button>
                  <button disabled={i === templates.length - 1} className="p-1 text-navy-400 disabled:opacity-20" onClick={() => move(t, 1)} aria-label="Aşağı"><ArrowDown size={16} /></button>
                </div>
                <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(t)}>
                  <div className="truncate font-semibold text-navy-800">{t.ad}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone="bronze">{t.grup}</Badge>
                    {t.mekanTurleri.map((x) => <Badge key={x}>{MEKAN_ETIKET[x]}</Badge>)}
                    <Badge>{formatSayi(gun)} adam-gün</Badge>
                    <Badge>{malSay} malzeme</Badge>
                    {r && r.eksikFiyat > 0 && <Badge tone="amber">{r.eksikFiyat} eksik fiyat</Badge>}
                    {t.varsayilanAcik && <Badge tone="green">Varsayılan açık</Badge>}
                  </div>
                </button>
                {r && (
                  <div className="hidden w-48 shrink-0 text-right text-sm sm:block">
                    <div className="text-xs text-navy-400">İşçilik {formatTL(r.iscilikMaliyet)} · Malzeme {formatTL(r.malzemeMaliyet)}</div>
                    <div className="font-bold text-navy-800">Satış {formatTL(r.satis)}</div>
                    <div className="text-xs text-navy-400">Maliyet {formatTL(r.maliyet)}</div>
                  </div>
                )}
                <button className="btn btn-ghost btn-sm !px-2" title="Kopyala" onClick={() => getDb().templates.put({ ...t, id: uid(), ad: `${t.ad} (kopya)`, sira: (templates.at(-1)?.sira ?? 0) + 1, satirlar: t.satirlar.map((l) => ({ ...l, id: uid() })) })}><Copy size={16} /></button>
              </div>
            );
          })}
        </div>
      )}

      {edit && (
        <Modal
          wide
          title={templates.some((t) => t.id === edit.id) ? "İş kalemini düzenle" : "Yeni iş kalemi"}
          onClose={() => setEdit(null)}
          footer={
            <>
              {templates.some((t) => t.id === edit.id) && (
                <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("İş kalemi silinsin mi? (Mevcut tekliflerdeki kalemler etkilenmez)")) { await getDb().templates.delete(edit.id); setEdit(null); } }}>Sil</button>
              )}
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>Vazgeç</button>
              <button className="btn btn-primary" disabled={!edit.ad.trim()} onClick={save}>Kaydet</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kalem adı"><TextInput autoFocus value={edit.ad} onChange={(v) => setEdit({ ...edit, ad: v })} placeholder="Örn. Elektrik hattı" /></Field>
              <Field label="Grup"><TextInput value={edit.grup} onChange={(v) => setEdit({ ...edit, grup: v })} placeholder="Söküm, Tesisat, Elektrik, Kaplama…" /></Field>
            </div>
            <Field label="Hangi mekanlarda çıksın">
              <div className="flex flex-wrap gap-2">
                {TURLER.map((x) => {
                  const on = edit.mekanTurleri.includes(x);
                  return <button key={x} type="button" onClick={() => setEdit({ ...edit, mekanTurleri: on ? edit.mekanTurleri.filter((y) => y !== x) : [...edit.mekanTurleri, x] })} className={cx("min-h-[40px] rounded-xl px-4 text-sm font-semibold", on ? "bg-navy-800 text-white" : "bg-navy-100 text-navy-600")}>{MEKAN_ETIKET[x]}</button>;
                })}
              </div>
            </Field>

            <div>
              <div className="label">İşçilik ve malzeme satırları</div>
              <LineEditor lines={edit.satirlar} onChange={(satirlar) => setEdit({ ...edit, satirlar })} products={products} labor={labor} results={editResults} showCost fireVarsayilan={ayar.fireYuzde} />
            </div>

            {editSonuc && (
              <div className="grid gap-2 rounded-xl bg-navy-50 p-3 text-sm sm:grid-cols-4">
                <div><div className="text-xs text-navy-400">İşçilik maliyeti</div><div className="font-bold">{formatTL(editSonuc.iscilikMaliyet)}</div></div>
                <div><div className="text-xs text-navy-400">Malzeme maliyeti</div><div className="font-bold">{formatTL(editSonuc.malzemeMaliyet)}</div></div>
                <div><div className="text-xs text-navy-400">Toplam maliyet</div><div className="font-bold">{formatTL(editSonuc.maliyet)}</div></div>
                <div><div className="text-xs text-navy-400">Satış ({ayar.karMalzemeYuzde}% / {ayar.karIscilikYuzde}% kârlı)</div><div className="font-bold text-navy-800">{formatTL(editSonuc.satis)}</div></div>
                <div className="sm:col-span-4 text-xs text-navy-400">{PRESET[ref].ad} örnek ölçüsüne göre ({formatSayi(o.zemin)} m² zemin, {formatSayi(o.duvar)} m² duvar).</div>
              </div>
            )}

            <Field label="Müşteriye görünen cümle" hint={"Yer tutucular: {zemin} {duvar} {toplam} {tavan} (m²), {marka} ve {urun} ('Metinde marka/ürün adı geçsin' işaretli satırın tedarikçi ve ürün adı)"}>
              <TextArea rows={3} value={edit.metin} onChange={(v) => setEdit({ ...edit, metin: v })} />
            </Field>
            <Toggle checked={edit.varsayilanAcik} onChange={(v) => setEdit({ ...edit, varsayilanAcik: v })} label="Yeni mekan eklenince varsayılan olarak açık gelsin" />
          </div>
        </Modal>
      )}
    </div>
  );
}

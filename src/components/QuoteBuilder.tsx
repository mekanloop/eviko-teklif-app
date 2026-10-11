"use client";

import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { LineEditor } from "./LineEditor";
import { Badge, Field, MoneyField, NumField, Select, TextArea, TextInput, Toggle, cx } from "./ui";
import { updateQuote } from "@/lib/data/actions";
import { blankItem, cloneOption, itemFromTemplate, newMekan } from "@/lib/data/quote-ops";
import { calcOption, catalogFor, olculer, type Catalog, type LineResult } from "@/lib/engine/calc";
import { formatSayi, formatTL } from "@/lib/engine/money";
import { renderItemText } from "@/lib/engine/text";
import { uid } from "@/lib/db/ids";
import {
  MEKAN_ETIKET,
  type LaborType,
  type LineDef,
  type Mekan,
  type MekanTuru,
  type Product,
  type Quote,
  type QuoteItem,
  type WorkTemplate,
} from "@/lib/types";

const TURLER = (Object.keys(MEKAN_ETIKET) as MekanTuru[]).map((v) => ({ value: v, label: MEKAN_ETIKET[v] }));

export function QuoteBuilder(props: {
  quote: Quote;
  products: Product[];
  labor: LaborType[];
  templates: WorkTemplate[];
  catalog: Catalog;
  optionId: string;
  presentation: boolean;
}) {
  const { quote, optionId } = props;
  const readOnly = quote.durum !== "taslak";
  const option = quote.secenekler.find((o) => o.id === optionId) ?? quote.secenekler[0];
  const cat = useMemo(() => catalogFor(quote.dondurulmus, props.catalog), [quote.dondurulmus, props.catalog]);
  const result = useMemo(() => calcOption(quote, option, props.catalog), [quote, option, props.catalog]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const edit = (fn: (q: Quote) => void) => updateQuote(quote.id, fn);
  const editOption = (fn: (o: Quote["secenekler"][number]) => void) =>
    edit((q) => {
      const o = q.secenekler.find((x) => x.id === option.id);
      if (o) fn(o);
    });
  const editMekan = (mid: string, fn: (m: Mekan) => void) =>
    editOption((o) => {
      const m = o.mekanlar.find((x) => x.id === mid);
      if (m) fn(m);
    });
  const editItem = (mid: string, iid: string, fn: (it: QuoteItem) => void) =>
    editMekan(mid, (m) => {
      const it = m.kalemler.find((x) => x.id === iid);
      if (it) fn(it);
    });

  const [yeniTur, setYeniTur] = useState<MekanTuru>("banyo");

  return (
    <div className="space-y-4">
      {option.mekanlar.length === 0 && (
        <div className="rounded-2xl border border-dashed border-navy-200 bg-white/70 p-6 text-center text-sm text-navy-500">
          Henüz mekan yok. Aşağıdan bir mekan türü seçip ekleyin; o mekana uygun iş kalemleri otomatik gelir, siz sadece gerekenleri açarsınız.
        </div>
      )}

      {option.mekanlar.map((m, mi) => {
        const mr = result.mekanlar.find((x) => x.id === m.id)!;
        const o = olculer(m);
        const aktifSayi = m.kalemler.filter((k) => k.aktif).length;
        const mevcutSablonlar = new Set(m.kalemler.map((k) => k.templateId).filter(Boolean));
        const eklenebilir = props.templates.filter((t) => !mevcutSablonlar.has(t.id));
        return (
          <section key={m.id} className="card overflow-hidden">
            <header className="flex flex-wrap items-center gap-3 border-b border-navy-100 bg-navy-800 px-4 py-3 text-white">
              <div className="min-w-0 flex-1">
                <input
                  disabled={readOnly}
                  className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-navy-300"
                  value={m.ad}
                  onChange={(e) => editMekan(m.id, (x) => (x.ad = e.target.value))}
                />
                <div className="text-xs text-navy-200">{MEKAN_ETIKET[m.tur]} · {aktifSayi}/{m.kalemler.length} kalem açık</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-navy-200">Mekan satışı</div>
                <div className="text-lg font-extrabold">{formatTL(mr.satis)}</div>
                {!props.presentation && <div className="text-xs text-navy-200">Maliyet {formatTL(mr.maliyet)}</div>}
              </div>
              {!readOnly && (
                <div className="flex gap-1">
                  <button className="btn btn-sm !bg-white/10 text-white hover:!bg-white/20" title="Mekanı kopyala" onClick={() => editOption((op) => op.mekanlar.splice(mi + 1, 0, { ...structuredClone(m), id: uid(), ad: `${m.ad} (kopya)`, kalemler: m.kalemler.map((k) => ({ ...structuredClone(k), id: uid(), satirlar: k.satirlar.map((l) => ({ ...l, id: uid() })) })) }))}><Copy size={16} /></button>
                  <button className="btn btn-sm !bg-white/10 text-white hover:!bg-red-500/70" title="Mekanı sil" onClick={() => confirm(`${m.ad} silinsin mi?`) && editOption((op) => (op.mekanlar = op.mekanlar.filter((x) => x.id !== m.id)))}><Trash2 size={16} /></button>
                </div>
              )}
            </header>

            {/* Ölçüler */}
            <div className="border-b border-navy-100 bg-navy-50/60 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <Field label="Tür"><Select disabled={readOnly} value={m.tur} onChange={(v) => editMekan(m.id, (x) => (x.tur = v))} options={TURLER} /></Field>
                <Field label="En (m)"><NumField disabled={readOnly} value={m.en} onChange={(v) => editMekan(m.id, (x) => (x.en = v ?? 0))} /></Field>
                <Field label="Boy (m)"><NumField disabled={readOnly} value={m.boy} onChange={(v) => editMekan(m.id, (x) => (x.boy = v ?? 0))} /></Field>
                <Field label="Yükseklik (m)"><NumField disabled={readOnly} value={m.yukseklik} onChange={(v) => editMekan(m.id, (x) => (x.yukseklik = v ?? 0))} /></Field>
                <Field label="Kapı/pencere düşümü"><NumField disabled={readOnly} suffix="m²" value={m.dusumM2} onChange={(v) => editMekan(m.id, (x) => (x.dusumM2 = v ?? 0))} /></Field>
                <Field label="Zemin m² (elle)"><NumField disabled={readOnly} placeholder={formatSayi(m.en * m.boy)} value={m.zeminOverride} onChange={(v) => editMekan(m.id, (x) => (x.zeminOverride = v))} /></Field>
                <Field label="Duvar m² (elle)"><NumField disabled={readOnly} placeholder={formatSayi(2 * (m.en + m.boy) * m.yukseklik - m.dusumM2)} value={m.duvarOverride} onChange={(v) => editMekan(m.id, (x) => (x.duvarOverride = v))} /></Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Badge tone="blue">Zemin {formatSayi(o.zemin)} m²</Badge>
                <Badge tone="blue">Duvar {formatSayi(o.duvar)} m²</Badge>
                <Badge tone="bronze">Zemin+duvar {formatSayi(o.toplam)} m²</Badge>
                <Badge>Tavan {formatSayi(o.tavan)} m²</Badge>
                <Badge>Çevre {formatSayi(o.cevre)} mt</Badge>
              </div>
            </div>

            {/* Kalemler */}
            <div className="divide-y divide-navy-50">
              {m.kalemler.map((it) => {
                const ir = mr.kalemler.find((x) => x.id === it.id)!;
                const isOpen = !!open[it.id];
                const results: Record<string, LineResult> = Object.fromEntries(ir.satirlar.map((s) => [s.id, s]));
                const metin = renderItemText(it, m, cat);
                return (
                  <div key={it.id} className={cx(!it.aktif && "bg-navy-50/50")}>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <Toggle disabled={readOnly} checked={it.aktif} onChange={(v) => editItem(m.id, it.id, (x) => (x.aktif = v))} />
                      <button className="min-w-0 flex-1 py-1 text-left" onClick={() => setOpen({ ...open, [it.id]: !isOpen })}>
                        <div className={cx("truncate font-semibold", it.aktif ? "text-navy-800" : "text-navy-400")}>{it.ad}</div>
                        {it.aktif && metin && <div className="truncate text-xs text-navy-400">{metin}</div>}
                      </button>
                      {it.aktif && ir.eksikFiyat > 0 && <Badge tone="amber">{ir.eksikFiyat} eksik fiyat</Badge>}
                      <div className="w-28 text-right">
                        <div className={cx("font-bold", it.aktif ? "text-navy-800" : "text-navy-300")}>{formatTL(ir.satis)}</div>
                        {!props.presentation && it.aktif && <div className="text-xs text-navy-400">m: {formatTL(ir.maliyet)}</div>}
                      </div>
                      <button className="p-2 text-navy-400" onClick={() => setOpen({ ...open, [it.id]: !isOpen })} aria-label="Ayrıntı">{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                    </div>
                    {isOpen && (
                      <div className="space-y-3 border-t border-navy-50 bg-white px-4 py-3">
                        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                          <Field label="Müşteriye görünen cümle" hint="{zemin} {duvar} {toplam} {tavan} {marka} {urun} yer tutucuları kullanılabilir">
                            <TextArea disabled={readOnly} rows={2} value={it.metin} onChange={(v) => editItem(m.id, it.id, (x) => (x.metin = v))} />
                          </Field>
                          <Field label="Kalem adı"><TextInput disabled={readOnly} value={it.ad} onChange={(v) => editItem(m.id, it.id, (x) => (x.ad = v))} /></Field>
                        </div>
                        <div className="rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-600"><span className="font-semibold">Önizleme:</span> {metin || "—"}</div>
                        <LineEditor
                          readOnly={readOnly}
                          lines={it.satirlar}
                          onChange={(satirlar: LineDef[]) => editItem(m.id, it.id, (x) => (x.satirlar = satirlar))}
                          products={props.products}
                          labor={props.labor}
                          results={results}
                          showCost={!props.presentation}
                          fireVarsayilan={quote.ayarlar.fireYuzde}
                        />
                        {!readOnly && (
                          <div className="text-right">
                            <button className="btn btn-danger btn-sm" onClick={() => editMekan(m.id, (x) => (x.kalemler = x.kalemler.filter((k) => k.id !== it.id)))}><Trash2 size={14} /> Kalemi kaldır</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2 border-t border-navy-100 p-3">
                {eklenebilir.length > 0 && (
                  <select
                    className="input !min-h-[40px] !w-auto"
                    value=""
                    onChange={(e) => {
                      const t = props.templates.find((x) => x.id === e.target.value);
                      if (t) editMekan(m.id, (x) => x.kalemler.push({ ...itemFromTemplate(t), aktif: true }));
                    }}
                  >
                    <option value="">+ Şablondan kalem ekle…</option>
                    {eklenebilir.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
                  </select>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => editMekan(m.id, (x) => x.kalemler.push(blankItem()))}><Plus size={16} /> Serbest kalem</button>
              </div>
            )}
          </section>
        );
      })}

      {!readOnly && (
        <div className="card flex flex-wrap items-center gap-2 p-3">
          <span className="px-1 text-sm font-semibold text-navy-600">Mekan ekle:</span>
          <div className="w-40"><Select value={yeniTur} onChange={setYeniTur} options={TURLER} /></div>
          <button
            className="btn btn-primary"
            onClick={() =>
              editOption((o) => {
                const say = o.mekanlar.filter((x) => x.tur === yeniTur).length;
                const ad = say === 0 ? MEKAN_ETIKET[yeniTur] : `${MEKAN_ETIKET[yeniTur]} ${say + 1}`;
                o.mekanlar.push(newMekan(yeniTur, ad, props.templates));
              })
            }
          >
            <Plus size={18} /> Mekan ekle
          </button>
        </div>
      )}

      {/* İndirim */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-semibold text-navy-800">Pazarlık / indirim</div>
          <div className="text-xs text-navy-400">Satış toplamından düşülür, sonra yuvarlama uygulanır.</div>
        </div>
        <div className="w-48"><MoneyField disabled={readOnly} value={option.indirim} onChange={(k) => editOption((o) => (o.indirim = k))} /></div>
      </div>
    </div>
  );
}

export function SummaryPanel(props: { quote: Quote; catalog: Catalog; optionId: string; presentation: boolean; onTogglePresentation: () => void }) {
  const { quote } = props;
  const option = quote.secenekler.find((o) => o.id === props.optionId) ?? quote.secenekler[0];
  const r = useMemo(() => calcOption(quote, option, props.catalog), [quote, option, props.catalog]);
  return (
    <div className="card sticky top-4 space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-navy-500">{option.ad} · özet</div>
        <button className="btn btn-ghost btn-sm" onClick={props.onTogglePresentation} title="Sunum modunda maliyet ve kâr gizlenir">
          {props.presentation ? <><Eye size={16} /> Maliyeti göster</> : <><EyeOff size={16} /> Sunum modu</>}
        </button>
      </div>
      <div className="space-y-1.5 text-sm">
        {r.mekanlar.map((m) => (
          <div key={m.id} className="flex justify-between"><span className="text-navy-600">{m.ad}</span><span className="font-semibold">{formatTL(m.musteriTutar)}</span></div>
        ))}
        {r.indirim > 0 && <div className="flex justify-between text-navy-500"><span>İndirim</span><span>−{formatTL(r.indirim)}</span></div>}
        {r.yuvarlamaFarki !== 0 && <div className="flex justify-between text-xs text-navy-400"><span>Yuvarlama ({formatTL(Math.abs(r.yuvarlamaFarki))} {r.yuvarlamaFarki > 0 ? "artı" : "eksi"})</span><span /></div>}
      </div>
      <div className="border-t border-navy-100 pt-3">
        {quote.kdvModu === "kdvli" && (
          <>
            <div className="flex justify-between text-sm"><span className="text-navy-500">KDV hariç</span><span>{formatTL(r.net)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-navy-500">KDV %{quote.kdvOrani}</span><span>{formatTL(r.kdv)}</span></div>
          </>
        )}
        <div className="mt-1">
          <div className="text-sm font-semibold text-navy-600">{quote.kdvModu === "kdvli" ? "Genel toplam" : "Genel toplam (nakit, KDV hariç)"}</div>
          <div className="whitespace-nowrap text-right text-3xl font-extrabold text-navy-800">{formatTL(r.genelToplam)}</div>
        </div>
      </div>
      {!props.presentation && (
        <div className="space-y-1 rounded-xl bg-navy-50 p-3 text-sm">
          <div className="flex justify-between"><span className="text-navy-500">Malzeme maliyeti</span><span>{formatTL(r.malzemeMaliyet)}</span></div>
          <div className="flex justify-between"><span className="text-navy-500">İşçilik maliyeti</span><span>{formatTL(r.iscilikMaliyet)}</span></div>
          <div className="flex justify-between font-semibold"><span>Toplam maliyet</span><span>{formatTL(r.maliyet)}</span></div>
          <div className={cx("flex justify-between font-bold", r.kar < 0 ? "text-red-700" : "text-emerald-700")}><span>Kâr</span><span>{formatTL(r.kar)} · %{formatSayi(r.karYuzde, 1)}</span></div>
        </div>
      )}
      {r.eksikFiyat > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          ⚠ {r.eksikFiyat} satırda fiyat veya yevmiye girilmemiş. Toplam eksik görünebilir.
        </div>
      )}
    </div>
  );
}

export function QuoteSettingsPanel({ quote }: { quote: Quote }) {
  const readOnly = quote.durum !== "taslak";
  const edit = (fn: (q: Quote) => void) => updateQuote(quote.id, fn);
  return (
    <div className="card space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Konu" className="sm:col-span-2"><TextInput disabled={readOnly} value={quote.konu} onChange={(v) => edit((q) => (q.konu = v))} /></Field>
        <Field label="Teklif tarihi"><TextInput disabled={readOnly} type="date" value={quote.tarih} onChange={(v) => edit((q) => (q.tarih = v))} /></Field>
        <Field label="Geçerlilik (gün)"><NumField disabled={readOnly} value={quote.gecerlilikGun} onChange={(v) => edit((q) => (q.gecerlilikGun = v ?? 0))} /></Field>
        <Field label="İşe başlangıç"><TextInput disabled={readOnly} type="date" value={quote.iseBaslama ?? ""} onChange={(v) => edit((q) => (q.iseBaslama = v || undefined))} /></Field>
        <Field label="Teslim süresi (iş günü)"><NumField disabled={readOnly} value={quote.teslimIsGunu} onChange={(v) => edit((q) => (q.teslimIsGunu = v))} /></Field>
        <Field label="Fiyat biçimi">
          <Select disabled={readOnly} value={quote.kdvModu} onChange={(v) => edit((q) => (q.kdvModu = v))} options={[{ value: "nakitKdvHaric", label: "Nakit, KDV hariç" }, { value: "kdvli", label: "KDV'li" }]} />
        </Field>
        {quote.kdvModu === "kdvli" && <Field label="KDV oranı"><NumField disabled={readOnly} suffix="%" value={quote.kdvOrani} onChange={(v) => edit((q) => (q.kdvOrani = v ?? 0))} /></Field>}
        <div className="flex items-end"><Toggle disabled={readOnly} checked={quote.mekanToplamGoster} onChange={(v) => edit((q) => (q.mekanToplamGoster = v))} label="Mekan toplamlarını göster" /></div>
      </div>
      <div className="grid gap-3 border-t border-navy-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Malzeme kârı"><NumField disabled={readOnly} suffix="%" value={quote.ayarlar.karMalzemeYuzde} onChange={(v) => edit((q) => (q.ayarlar.karMalzemeYuzde = v ?? 0))} /></Field>
        <Field label="İşçilik kârı"><NumField disabled={readOnly} suffix="%" value={quote.ayarlar.karIscilikYuzde} onChange={(v) => edit((q) => (q.ayarlar.karIscilikYuzde = v ?? 0))} /></Field>
        <Field label="Fire"><NumField disabled={readOnly} suffix="%" value={quote.ayarlar.fireYuzde} onChange={(v) => edit((q) => (q.ayarlar.fireYuzde = v ?? 0))} /></Field>
        <Field label="Toplamı yuvarla" hint="0 = yuvarlama yok"><NumField disabled={readOnly} suffix="₺ katı" value={quote.ayarlar.yuvarlamaTL} onChange={(v) => edit((q) => (q.ayarlar.yuvarlamaTL = v ?? 0))} /></Field>
      </div>
    </div>
  );
}

export function StringListEditor(props: { title: string; items: string[]; onChange: (items: string[]) => void; readOnly?: boolean; hint?: string }) {
  return (
    <div className="card space-y-2 p-4">
      <div className="font-semibold text-navy-800">{props.title}</div>
      {props.hint && <div className="text-xs text-navy-400">{props.hint}</div>}
      {props.items.map((s, i) => (
        <div key={i} className="flex gap-2">
          <TextArea disabled={props.readOnly} rows={2} value={s} onChange={(v) => props.onChange(props.items.map((x, j) => (j === i ? v : x)))} />
          {!props.readOnly && <button className="btn btn-ghost btn-sm !px-2 self-start text-red-600" onClick={() => props.onChange(props.items.filter((_, j) => j !== i))} aria-label="Sil"><Trash2 size={16} /></button>}
        </div>
      ))}
      {!props.readOnly && <button className="btn btn-ghost btn-sm" onClick={() => props.onChange([...props.items, ""])}><Plus size={16} /> Madde ekle</button>}
    </div>
  );
}

export function cloneOptionAs(o: Quote["secenekler"][number], ad: string) {
  return cloneOption(o, ad);
}

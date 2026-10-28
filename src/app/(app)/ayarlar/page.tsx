"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { StringListEditor } from "@/components/QuoteBuilder";
import { Field, Loading, NumField, PageHeader, TextArea, TextInput } from "@/components/ui";
import { saveSettings } from "@/lib/data/actions";
import { onbellekTemizle } from "@/lib/data/cache-reset";
import { exportBackup, importBackup, type BackupFile } from "@/lib/data/backup";
import { loadDemo, removeDemo } from "@/lib/data/demo";
import { useSettings } from "@/lib/data/hooks";
import { getDb } from "@/lib/db/schema";
import { uid } from "@/lib/db/ids";
import type { Settings } from "@/lib/types";

function Section(props: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold text-navy-800">{props.title}</h2>
      {props.sub && <p className="mb-3 text-sm text-navy-500">{props.sub}</p>}
      <div className="mt-3 space-y-3">{props.children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!s) return <Loading />;
  const set = (p: Partial<Settings>) => saveSettings(p);

  async function yedekAl() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `eviko-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  async function yedekYukle(f: File) {
    if (!confirm("Mevcut tüm veriler silinip yedekteki verilerle değiştirilecek. Devam edilsin mi?")) return;
    try {
      setBusy(true);
      await importBackup(JSON.parse(await f.text()) as BackupFile);
      alert("Yedek yüklendi.");
    } catch (e) {
      alert(`Yedek yüklenemedi: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  function logoYukle(f: File) {
    const r = new FileReader();
    r.onload = () => set({ logo: String(r.result) });
    r.readAsDataURL(f);
  }

  async function hepsiniSil() {
    if (!confirm("TÜM veriler (müşteri, teklif, fiyat listesi…) silinecek. Önce yedek aldığınızdan emin olun. Devam?")) return;
    if (!confirm("Bu işlem geri alınamaz. Gerçekten silinsin mi?")) return;
    const db = getDb();
    await Promise.all(db.tables.map((t) => t.clear()));
    location.href = "/";
  }

  return (
    <>
      <PageHeader title="Ayarlar" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Firma bilgileri" sub="Teklif ve belge başlığında görünür.">
          <Field label="Firma adı"><TextInput value={s.firmaAd} onChange={(v) => set({ firmaAd: v })} /></Field>
          <Field label="Alt başlık"><TextInput value={s.firmaAlt} onChange={(v) => set({ firmaAlt: v })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vergi dairesi"><TextInput value={s.vergiDairesi} onChange={(v) => set({ vergiDairesi: v })} /></Field>
            <Field label="Vergi no"><TextInput value={s.vergiNo} onChange={(v) => set({ vergiNo: v })} /></Field>
            <Field label="Telefon"><TextInput type="tel" value={s.telefon} onChange={(v) => set({ telefon: v })} /></Field>
            <Field label="E-posta"><TextInput type="email" value={s.eposta} onChange={(v) => set({ eposta: v })} /></Field>
            <Field label="Web"><TextInput value={s.web} onChange={(v) => set({ web: v })} /></Field>
            <Field label="Adres"><TextInput value={s.adres} onChange={(v) => set({ adres: v })} /></Field>
          </div>
          <Field label="IBAN"><TextInput value={s.iban} onChange={(v) => set({ iban: v })} /></Field>
          <div>
            <div className="label">Logo</div>
            <div className="flex items-center gap-3">
              {s.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo} alt="logo" className="max-h-14 max-w-[200px] rounded border border-navy-100 bg-white p-1" />
              ) : <div className="text-sm text-navy-400">Yüklenmedi, firma adı yazı olarak basılır.</div>}
              <button className="btn btn-ghost btn-sm" onClick={() => logoRef.current?.click()}><Upload size={16} /> Logo yükle</button>
              {s.logo && <button className="btn btn-danger btn-sm" onClick={() => set({ logo: undefined })}>Kaldır</button>}
              <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) logoYukle(f); e.target.value = ""; }} />
            </div>
          </div>
        </Section>

        <Section title="Hesap varsayılanları" sub="Yeni tekliflere kopyalanır; her teklifte ayrıca değiştirilebilir.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Malzeme kârı"><NumField suffix="%" value={s.karMalzemeYuzde} onChange={(v) => set({ karMalzemeYuzde: v ?? 0 })} /></Field>
            <Field label="İşçilik kârı"><NumField suffix="%" value={s.karIscilikYuzde} onChange={(v) => set({ karIscilikYuzde: v ?? 0 })} /></Field>
            <Field label="Fire"><NumField suffix="%" value={s.fireYuzde} onChange={(v) => set({ fireYuzde: v ?? 0 })} /></Field>
            <Field label="Toplamı yuvarla (₺ katı)" hint="0 = yuvarlama yok"><NumField suffix="₺" value={s.yuvarlamaTL} onChange={(v) => set({ yuvarlamaTL: v ?? 0 })} /></Field>
            <Field label="KDV oranı (KDV'li tekliflerde)" hint="Muhasebecinizle teyit edin"><NumField suffix="%" value={s.kdvOrani} onChange={(v) => set({ kdvOrani: v ?? 0 })} /></Field>
            <Field label="Teklif geçerliliği (gün)"><NumField value={s.gecerlilikGun} onChange={(v) => set({ gecerlilikGun: v ?? 0 })} /></Field>
          </div>
          <Field label="Her mekanın son maddesi"><TextArea rows={2} value={s.mekanKapanisMetni} onChange={(v) => set({ mekanKapanisMetni: v })} /></Field>
        </Section>

        <div className="lg:col-span-2 grid gap-4 lg:grid-cols-2">
          <StringListEditor title="Varsayılan notlar — Ön teklif" hint="{gecerlilik} {iseBaslama} {teslim}" items={s.varsayilanNotlarOn} onChange={(v) => set({ varsayilanNotlarOn: v })} />
          <StringListEditor title="Varsayılan notlar — Kesin teklif" hint="{gecerlilik} {iseBaslama} {teslim}" items={s.varsayilanNotlarKesin} onChange={(v) => set({ varsayilanNotlarKesin: v })} />
          <StringListEditor title="Varsayılan genel şartlar" items={s.varsayilanSartlar} onChange={(v) => set({ varsayilanSartlar: v })} />
          <div className="card space-y-2 p-4">
            <div className="font-semibold text-navy-800">Varsayılan ödeme planı</div>
            <div className="text-xs text-navy-400">Yeni tekliflere kopyalanır. Toplam %100 olmalı.</div>
            {s.varsayilanPlan.map((p, i) => (
              <div key={p.id} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                <TextInput value={p.ad} onChange={(v) => set({ varsayilanPlan: s.varsayilanPlan.map((x, j) => (j === i ? { ...x, ad: v } : x)) })} />
                <NumField suffix="%" value={p.yuzde} onChange={(v) => set({ varsayilanPlan: s.varsayilanPlan.map((x, j) => (j === i ? { ...x, yuzde: v ?? 0 } : x)) })} />
                <button className="btn btn-ghost btn-sm text-red-600" onClick={() => set({ varsayilanPlan: s.varsayilanPlan.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button className="btn btn-ghost btn-sm" onClick={() => set({ varsayilanPlan: [...s.varsayilanPlan, { id: uid(), ad: "Ödeme", yuzde: 0 }] })}>Aşama ekle</button>
              <span className={Math.round(s.varsayilanPlan.reduce((a, p) => a + p.yuzde, 0)) === 100 ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-red-700"}>Toplam %{s.varsayilanPlan.reduce((a, p) => a + p.yuzde, 0)}</span>
            </div>
          </div>
        </div>

        <Section title="Yedek ve veri" sub="Veriler şu an yalnızca bu cihazın tarayıcısında durur. Düzenli yedek alın. (Bulut veritabanı bağlandığında bu bölüm gerekmeyecek.)">
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={yedekAl}><Download size={18} /> Yedek indir (JSON)</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={18} /> Yedekten geri yükle</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void yedekYukle(f); e.target.value = ""; }} />
          </div>
        </Section>

        <Section title="Uygulama önbelleği" sub="Sayfalar açılmıyor, menü eski görünüyor veya düğmeler çalışmıyorsa uygulama dosyası önbelleğini yenileyin. Müşteri, proje, teklif ve fiyat verilerinize DOKUNMAZ.">
          <button className="btn btn-ghost" onClick={async () => { await onbellekTemizle(); alert("Önbellek temizlendi. Uygulama yeniden yüklenecek; verileriniz yerinde."); location.reload(); }}>Önbelleği yenile (verilere dokunmaz)</button>
        </Section>

        <Section title="Örnek veri" sub="Uygulamayı denemek için uydurma fiyatlı örnek ürünler, yevmiyeler ve bir örnek teklif ekler. Gerçek veriniz etkilenmez; istediğiniz an silebilirsiniz.">
          {s.demoYuklu ? (
            <button className="btn btn-danger" onClick={() => confirm("Örnek veriler silinsin mi?") && removeDemo()}>Örnek verileri sil</button>
          ) : (
            <button className="btn btn-ghost" onClick={() => loadDemo()}>Örnek verileri yükle</button>
          )}
        </Section>

        <Section title="Tehlikeli bölge">
          <button className="btn btn-danger" onClick={hepsiniSil}><Trash2 size={18} /> Tüm verileri sil</button>
        </Section>
      </div>
    </>
  );
}

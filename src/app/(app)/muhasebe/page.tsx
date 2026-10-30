"use client";

import { FileDown, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, DatalistOptions, Empty, Field, Loading, Modal, MoneyField, PageHeader, Select, Stat, Tabs, TextInput, cx } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { todayIso, uid } from "@/lib/db/ids";
import { useAllExpensesList, useAllExtraJobs, useAllPaymentsList, useCatalog, useCustomers, useProjects, useQuotes } from "@/lib/data/hooks";
import { calcOption } from "@/lib/engine/calc";
import { projectFinance } from "@/lib/engine/finance";
import { formatSayi, formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import { GIDER_KATEGORI_ETIKET, type Expense, type GiderKategori, type Payment } from "@/lib/types";

type Sekme = "ozet" | "alinan" | "yapilan" | "yerler" | "is";
type Donem = "tumu" | "bu-ay" | "gecen-ay" | "bu-yil";

const SEKIL = [
  { value: "nakit", label: "Nakit" },
  { value: "havale", label: "Havale / EFT" },
  { value: "kart", label: "Kart" },
  { value: "cek", label: "Çek / senet" },
] as const;
const SEKIL_AD = Object.fromEntries(SEKIL.map((s) => [s.value, s.label]));
const KAT = (Object.keys(GIDER_KATEGORI_ETIKET) as GiderKategori[]).map((value) => ({ value, label: GIDER_KATEGORI_ETIKET[value] }));

function donemAraligi(d: Donem): [string, string] {
  const n = new Date();
  const y = n.getFullYear();
  const m = n.getMonth();
  const iso = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  if (d === "bu-ay") return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
  if (d === "gecen-ay") return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (d === "bu-yil") return [`${y}-01-01`, `${y}-12-31`];
  return ["0000-01-01", "9999-12-31"];
}

export default function AccountingPage() {
  const payments = useAllPaymentsList();
  const expenses = useAllExpensesList();
  const projects = useProjects();
  const customers = useCustomers();
  const quotes = useQuotes();
  const extras = useAllExtraJobs();
  const catalog = useCatalog();
  const [tab, setTab] = useState<Sekme>("ozet");
  const [donem, setDonem] = useState<Donem>("bu-ay");
  const [pEdit, setPEdit] = useState<Payment | null>(null);
  const [eEdit, setEEdit] = useState<Expense | null>(null);
  const [yerSec, setYerSec] = useState<string | null>(null);

  const [bas, son] = donemAraligi(donem);
  const veri = useMemo(() => {
    if (!payments || !expenses || !projects || !customers || !quotes || !extras || !catalog) return null;
    const projAd = (id?: string) => {
      const p = projects.find((x) => x.id === id);
      if (!p) return "Genel (işe bağlı değil)";
      return `${customers.find((c) => c.id === p.customerId)?.ad ?? "—"} · ${p.ad}`;
    };
    const inD = (t: string) => t >= bas && t <= son;
    const pd = payments.filter((p) => inD(p.tarih));
    const ed = expenses.filter((e) => inD(e.tarih));
    const isler = projects.map((p) => {
      const q = quotes.find((x) => x.id === p.onayliQuoteId);
      const o = q ? (q.secenekler.find((s) => s.id === q.secilenSecenekId) ?? q.secenekler[0]) : undefined;
      const res = q && o ? calcOption(q, o, catalog) : undefined;
      const f = projectFinance(res, extras.filter((e) => e.projectId === p.id), payments.filter((x) => x.projectId === p.id), expenses.filter((x) => x.projectId === p.id));
      return { p, ad: projAd(p.id), f, onayli: !!q };
    });
    const genelGider = expenses.filter((e) => !e.projectId && e.kategori !== "kisisel").reduce((a, e) => a + e.tutar, 0);
    const kisiselGider = expenses.filter((e) => e.kategori === "kisisel").reduce((a, e) => a + e.tutar, 0);
    return { projAd, pd, ed, isler, genelGider, kisiselGider };
  }, [payments, expenses, projects, customers, quotes, extras, catalog, bas, son]);

  if (!veri || !projects || !payments || !expenses) return <Loading />;
  const { projAd, pd, ed, isler, genelGider, kisiselGider } = veri;
  const toplamAlinan = pd.reduce((a, p) => a + p.tutar, 0);
  const toplamOdenen = ed.reduce((a, e) => a + e.tutar, 0);

  // Yerler (ödeme yapılan yerler)
  const yerler = Array.from(
    ed.reduce((m, e) => {
      const k = e.tedarikci.trim() || "(Belirtilmemiş)";
      const r = m.get(k) ?? { ad: k, toplam: 0, adet: 0, son: "", satirlar: [] as Expense[] };
      r.toplam += e.tutar;
      r.adet += 1;
      if (e.tarih > r.son) r.son = e.tarih;
      r.satirlar.push(e);
      m.set(k, r);
      return m;
    }, new Map<string, { ad: string; toplam: number; adet: number; son: string; satirlar: Expense[] }>()).values(),
  ).sort((a, b) => b.toplam - a.toplam);

  const yeniP = (): Payment => ({ id: uid(), projectId: projects[0]?.id ?? "", tarih: todayIso(), aciklama: "", tutar: 0, sekil: "nakit" });
  const yeniE = (): Expense => ({ id: uid(), projectId: undefined, tarih: todayIso(), kategori: "malzeme", aciklama: "", tedarikci: "", tutar: 0, sekil: "nakit" });

  // Aylık akış (son 6 ay)
  const aylar = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const al = payments.filter((p) => p.tarih.startsWith(key)).reduce((a, p) => a + p.tutar, 0);
    const od = expenses.filter((e) => e.tarih.startsWith(key)).reduce((a, e) => a + e.tutar, 0);
    return { key, ad: d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }), al, od };
  });

  const donemSecici = (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-navy-500">Dönem</span>
      {([["bu-ay", "Bu ay"], ["gecen-ay", "Geçen ay"], ["bu-yil", "Bu yıl"], ["tumu", "Tümü"]] as const).map(([k, l]) => (
        <button key={k} onClick={() => setDonem(k)} className={cx("min-h-[40px] rounded-xl px-4 text-sm font-semibold", donem === k ? "bg-navy-800 text-white" : "bg-white text-navy-600")}>{l}</button>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader title="Muhasebe" sub="Para girişi, para çıkışı ve iş bazlı kazanç" />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: "ozet", label: "Özet" },
        { value: "alinan", label: "Alınan ödemeler" },
        { value: "yapilan", label: "Yapılan ödemeler" },
        { value: "yerler", label: "Ödeme yapılan yerler" },
        { value: "is", label: "İş bazlı kazanç" },
      ]} />

      {tab !== "is" && donemSecici}

      {tab === "ozet" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Alınan ödemeler" value={formatTL(toplamAlinan)} tone="good" sub={`${pd.length} kayıt`} />
            <Stat label="Yapılan ödemeler" value={formatTL(toplamOdenen)} tone="warn" sub={`${ed.length} kayıt`} />
            <Stat label="Net kasa (alınan − yapılan)" value={formatTL(toplamAlinan - toplamOdenen)} tone={toplamAlinan - toplamOdenen >= 0 ? "good" : "warn"} />
            <Stat label="Tahsil edilecek (tüm işler)" value={formatTL(Math.max(0, isler.reduce((a, r) => a + (r.onayli ? r.f.kalan : 0), 0)))} sub="Onaylı işlerde kalan bakiye" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="İşlerin toplam net kazancı" value={formatTL(isler.reduce((a, r) => a + (r.onayli ? r.f.gercekKar : 0), 0))} sub="Net satış − işlere yazılan harcamalar" />
            <Stat label="Genel giderler (işe bağlı olmayan)" value={formatTL(genelGider)} sub="Tüm zamanlar" />
            <Stat label="Kişisel giderler" value={formatTL(kisiselGider)} sub="Kasadan çıkan, iş maliyetine yazılmayan" tone="warn" />
            <Stat label="Genel kasa (tüm zamanlar)" value={formatTL(payments.reduce((a, p) => a + p.tutar, 0) - expenses.reduce((a, e) => a + e.tutar, 0))} sub="Tüm alınan − tüm yapılan" />
          </div>
          <div className="card overflow-hidden">
            <div className="border-b border-navy-100 bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-700">Son 6 ay</div>
            <table className="w-full"><thead><tr><th className="th">Ay</th><th className="th text-right">Alınan</th><th className="th text-right">Yapılan</th><th className="th text-right">Net</th></tr></thead>
              <tbody className="divide-y divide-navy-50">
                {aylar.map((a) => (<tr key={a.key}><td className="td capitalize">{a.ad}</td><td className="td text-right text-emerald-700">{formatTL(a.al)}</td><td className="td text-right text-bronze-700">{formatTL(a.od)}</td><td className={cx("td text-right font-bold", a.al - a.od < 0 && "text-red-700")}>{formatTL(a.al - a.od)}</td></tr>))}
              </tbody></table>
          </div>
        </div>
      )}

      {tab === "alinan" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between"><div className="text-sm text-navy-500">Toplam: <b className="text-emerald-700">{formatTL(toplamAlinan)}</b></div><button className="btn btn-primary" disabled={projects.length === 0} onClick={() => setPEdit(yeniP())}><Plus size={18} /> Alınan ödeme ekle</button></div>
          {pd.length === 0 ? <Empty title="Bu dönemde alınan ödeme yok" sub={projects.length === 0 ? "Önce bir proje oluşturun." : undefined} /> : (
            <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead className="border-b border-navy-100 bg-navy-50"><tr><th className="th">Tarih</th><th className="th">Müşteri · proje</th><th className="th">Açıklama</th><th className="th">Şekil</th><th className="th text-right">Tutar</th></tr></thead>
              <tbody className="divide-y divide-navy-50">{pd.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-navy-50" onClick={() => setPEdit(p)}><td className="td">{formatTarih(p.tarih)}</td><td className="td">{projAd(p.projectId)}</td><td className="td text-navy-500">{p.aciklama}</td><td className="td">{SEKIL_AD[p.sekil]}</td><td className="td text-right font-bold text-emerald-700">{formatTL(p.tutar)}</td></tr>
              ))}</tbody></table></div></div>
          )}
        </div>
      )}

      {tab === "yapilan" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between"><div className="text-sm text-navy-500">Toplam: <b className="text-bronze-700">{formatTL(toplamOdenen)}</b></div><button className="btn btn-primary" onClick={() => setEEdit(yeniE())}><Plus size={18} /> Yapılan ödeme ekle</button></div>
          {ed.length === 0 ? <Empty title="Bu dönemde yapılan ödeme yok" /> : (
            <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead className="border-b border-navy-100 bg-navy-50"><tr><th className="th">Tarih</th><th className="th">Ödeme yapılan yer</th><th className="th">Kategori</th><th className="th">İş</th><th className="th">Şekil</th><th className="th text-right">Tutar</th></tr></thead>
              <tbody className="divide-y divide-navy-50">{ed.map((e) => (
                <tr key={e.id} className="cursor-pointer hover:bg-navy-50" onClick={() => setEEdit(e)}><td className="td">{formatTarih(e.tarih)}</td><td className="td"><div className="font-semibold text-navy-800">{e.tedarikci || "—"}</div><div className="text-xs text-navy-400">{e.aciklama}</div></td><td className="td">{GIDER_KATEGORI_ETIKET[e.kategori]}</td><td className="td text-navy-600">{projAd(e.projectId)}</td><td className="td">{e.sekil ? SEKIL_AD[e.sekil] : "—"}</td><td className="td text-right font-bold">{formatTL(e.tutar)}</td></tr>
              ))}</tbody></table></div></div>
          )}
        </div>
      )}

      {tab === "yerler" && (
        <div className="space-y-3">
          {yerler.length === 0 ? <Empty title="Bu dönemde ödeme yapılan yer yok" sub="Yapılan ödemelerde 'Ödeme yapılan yer / kişi' alanını doldurun (tedarikçi, usta, benzinci…)." /> : (
            <div className="card divide-y divide-navy-50">
              {yerler.map((y) => (
                <div key={y.ad}>
                  <button onClick={() => setYerSec(yerSec === y.ad ? null : y.ad)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-navy-50">
                    <div className="min-w-0"><div className="font-bold text-navy-800">{y.ad}</div><div className="text-xs text-navy-400">{y.adet} ödeme · son {formatTarih(y.son)}</div></div>
                    <div className="font-bold">{formatTL(y.toplam)}</div>
                  </button>
                  {yerSec === y.ad && (
                    <div className="bg-navy-50/60 px-4 py-2">
                      {y.satirlar.sort((a, b) => b.tarih.localeCompare(a.tarih)).map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-3 py-1.5 text-sm"><span className="min-w-0 truncate">{formatTarih(e.tarih)} · {e.aciklama || GIDER_KATEGORI_ETIKET[e.kategori]} <span className="text-navy-400">· {projAd(e.projectId)}</span></span><span className="font-semibold">{formatTL(e.tutar)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "is" && (
        <div className="space-y-3">
          <p className="text-sm text-navy-500">Her iş kendi dosyasıdır: net satış, alınan ödeme, yapılan harcama ve net kazanç. Net satış KDV hariçtir. "İş dosyası"nı PDF olarak alabilirsiniz.</p>
          {isler.length === 0 ? <Empty title="Proje yok" /> : (
            <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[860px]"><thead className="border-b border-navy-100 bg-navy-50"><tr>
              <th className="th">İş</th><th className="th text-right">Net satış</th><th className="th text-right">Alınan</th><th className="th text-right">Kalan alacak</th><th className="th text-right">Harcama</th><th className="th text-right">Net kazanç</th><th className="th text-right">Kasa</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-navy-50">
                {isler.map(({ p, ad, f, onayli }) => (
                  <tr key={p.id} className="hover:bg-navy-50">
                    <td className="td"><Link href={`/projeler/${p.id}`} className="font-semibold text-navy-800 underline-offset-2 hover:underline">{ad}</Link>{!onayli && <> <Badge tone="amber">Onaylı teklif yok</Badge></>}</td>
                    <td className="td text-right">{formatTL(f.netSatis)}</td>
                    <td className="td text-right text-emerald-700">{formatTL(f.alinan)}</td>
                    <td className="td text-right">{onayli ? formatTL(f.kalan) : "—"}</td>
                    <td className="td text-right text-bronze-700">{formatTL(f.gercekMaliyet)}</td>
                    <td className={cx("td text-right font-bold", f.gercekKar < 0 && "text-red-700")}>{onayli ? <>{formatTL(f.gercekKar)} <span className="text-xs font-normal text-navy-400">%{formatSayi(f.gercekKarYuzde, 1)}</span></> : "—"}</td>
                    <td className={cx("td text-right", f.alinan - f.gercekMaliyet < 0 && "text-red-700")}>{formatTL(f.alinan - f.gercekMaliyet)}</td>
                    <td className="td"><Link href={`/projeler/${p.id}/dosya`} className="btn btn-ghost btn-sm"><FileDown size={14} /> İş dosyası</Link></td>
                  </tr>
                ))}
                <tr className="bg-navy-50 font-bold"><td className="td">TOPLAM</td>
                  <td className="td text-right">{formatTL(isler.reduce((a, r) => a + r.f.netSatis, 0))}</td><td className="td text-right">{formatTL(isler.reduce((a, r) => a + r.f.alinan, 0))}</td><td className="td text-right">{formatTL(isler.reduce((a, r) => a + (r.onayli ? r.f.kalan : 0), 0))}</td><td className="td text-right">{formatTL(isler.reduce((a, r) => a + r.f.gercekMaliyet, 0))}</td><td className="td text-right">{formatTL(isler.reduce((a, r) => a + (r.onayli ? r.f.gercekKar : 0), 0))}</td><td className="td text-right">{formatTL(isler.reduce((a, r) => a + r.f.alinan - r.f.gercekMaliyet, 0))}</td><td className="td" /></tr>
              </tbody></table></div></div>
          )}
          <p className="text-xs text-navy-400"><b>Net kazanç</b> = net satış − işe yazılan harcamalar (iş bittikten sonra kesinleşir). <b>Kasa</b> = o işten alınan − o işe yapılan ödemeler.</p>
        </div>
      )}

      <DatalistOptions id="yer-listesi" values={expenses.map((e) => e.tedarikci)} />

      {pEdit && (
        <Modal title={payments.some((p) => p.id === pEdit.id) ? "Alınan ödemeyi düzenle" : "Alınan ödeme ekle"} onClose={() => setPEdit(null)} footer={<>
          {payments.some((p) => p.id === pEdit.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Kayıt silinsin mi?")) { await getDb().payments.delete(pEdit.id); setPEdit(null); } }}><Trash2 size={16} /></button>}
          <button className="btn btn-ghost" onClick={() => setPEdit(null)}>Vazgeç</button>
          <button className="btn btn-primary" disabled={pEdit.tutar <= 0 || !pEdit.projectId} onClick={async () => { await getDb().payments.put(pEdit); setPEdit(null); }}>Kaydet</button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="İş (proje)" className="sm:col-span-2"><Select value={pEdit.projectId} onChange={(v) => setPEdit({ ...pEdit, projectId: v })} options={projects.map((p) => ({ value: p.id, label: projAd(p.id) }))} /></Field>
            <Field label="Tarih"><TextInput type="date" value={pEdit.tarih} onChange={(v) => setPEdit({ ...pEdit, tarih: v })} /></Field>
            <Field label="Tutar (₺)"><MoneyField value={pEdit.tutar} onChange={(k) => setPEdit({ ...pEdit, tutar: k })} /></Field>
            <Field label="Açıklama" className="sm:col-span-2"><TextInput value={pEdit.aciklama} onChange={(v) => setPEdit({ ...pEdit, aciklama: v })} placeholder="Kapora, ara ödeme…" /></Field>
            <Field label="Ödeme şekli" className="sm:col-span-2"><Select value={pEdit.sekil} onChange={(v) => setPEdit({ ...pEdit, sekil: v })} options={SEKIL.map((s) => ({ ...s }))} /></Field>
          </div>
        </Modal>
      )}

      {eEdit && (
        <Modal title={expenses.some((e) => e.id === eEdit.id) ? "Yapılan ödemeyi düzenle" : "Yapılan ödeme ekle"} onClose={() => setEEdit(null)} footer={<>
          {expenses.some((e) => e.id === eEdit.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Kayıt silinsin mi?")) { await getDb().expenses.delete(eEdit.id); setEEdit(null); } }}><Trash2 size={16} /></button>}
          <button className="btn btn-ghost" onClick={() => setEEdit(null)}>Vazgeç</button>
          <button className="btn btn-primary" disabled={eEdit.tutar <= 0} onClick={async () => { await getDb().expenses.put(eEdit); setEEdit(null); }}>Kaydet</button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ödeme yapılan yer / kişi" className="sm:col-span-2"><TextInput list="yer-listesi" value={eEdit.tedarikci} onChange={(v) => setEEdit({ ...eEdit, tedarikci: v })} placeholder="Tedarikçi, usta, benzinci…" /></Field>
            <Field label="Hangi işe ait" className="sm:col-span-2"><Select value={eEdit.projectId ?? ""} onChange={(v) => setEEdit({ ...eEdit, projectId: v || undefined })} placeholder="Genel gider (işe bağlı değil)" options={projects.map((p) => ({ value: p.id, label: projAd(p.id) }))} /></Field>
            <Field label="Tarih"><TextInput type="date" value={eEdit.tarih} onChange={(v) => setEEdit({ ...eEdit, tarih: v })} /></Field>
            <Field label="Tutar (₺)"><MoneyField value={eEdit.tutar} onChange={(k) => setEEdit({ ...eEdit, tutar: k })} /></Field>
            <Field label="Kategori"><Select value={eEdit.kategori} onChange={(v) => setEEdit({ ...eEdit, kategori: v })} options={KAT} /></Field>
            <Field label="Ödeme şekli"><Select value={eEdit.sekil ?? "nakit"} onChange={(v) => setEEdit({ ...eEdit, sekil: v })} options={SEKIL.map((s) => ({ ...s }))} /></Field>
            <Field label="Açıklama" className="sm:col-span-2"><TextInput value={eEdit.aciklama} onChange={(v) => setEEdit({ ...eEdit, aciklama: v })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

"use client";

import { useParams } from "next/navigation";
import { InfoGrid, Letterhead, PrintToolbar, SheetFooter } from "@/components/print";
import { Loading } from "@/components/ui";
import { useCatalog, useCustomer, useExpenses, useExtraJobs, usePayments, useProject, useProjectQuotes, useSettings } from "@/lib/data/hooks";
import { quoteTitle } from "@/lib/data/quote-ops";
import { calcOption } from "@/lib/engine/calc";
import { projectFinance } from "@/lib/engine/finance";
import { formatSayi, formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import { GIDER_KATEGORI_ETIKET, type GiderKategori } from "@/lib/types";

/** İş dosyası: bir işin tüm para hareketleri ve net kazancı (iç kullanım, müşteriye verilmez). */
export default function ProjectFilePage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const settings = useSettings();
  const customer = useCustomer(project?.customerId ?? "");
  const quotes = useProjectQuotes(id);
  const payments = usePayments(id);
  const expenses = useExpenses(id);
  const extras = useExtraJobs(id);
  const catalog = useCatalog();
  if (!project || !settings || !quotes || !payments || !expenses || !extras || !catalog) return <Loading />;

  const q = quotes.find((x) => x.id === project.onayliQuoteId);
  const o = q ? (q.secenekler.find((s) => s.id === q.secilenSecenekId) ?? q.secenekler[0]) : undefined;
  const res = q && o ? calcOption(q, o, catalog) : undefined;
  const f = projectFinance(res, extras, payments, expenses);
  const kategoriler = (Object.keys(GIDER_KATEGORI_ETIKET) as GiderKategori[]).filter((k) => f.harcamaKategori[k] > 0);
  const onayliEk = extras.filter((e) => e.durum === "onaylandi");

  return (
    <div style={{ background: "#e9edf4", minHeight: "100vh" }}>
      <PrintToolbar backHref={`/projeler/${id}`} backLabel="Projeye dön" hint="İç kullanım belgesi: müşteriye verilmez" />
      <div className="sheet">
        <Letterhead settings={settings} title="İŞ DOSYASI" lines={["İç kullanım", `Tarih: ${formatTarih(new Date().toISOString())}`]} />
        <InfoGrid rows={[
          ["Müşteri", customer?.ad ?? "—"],
          ["İş", project.ad],
          ["Adres", project.adres || "—"],
          ["Onaylı teklif", q ? `${q.no} · ${quoteTitle(q)}` : "Onaylı teklif yok"],
        ]} />

        <div className="band"><span>NET KAZANÇ ÖZETİ</span></div>
        <table className="tbl keep" style={{ marginTop: 6, marginBottom: 14 }}>
          <tbody>
            <tr><td>Sözleşme bedeli</td><td style={{ textAlign: "right" }}>{formatTL(f.sozlesme)}</td></tr>
            <tr><td>Onaylı ek işler</td><td style={{ textAlign: "right" }}>{formatTL(f.ekIsler)}</td></tr>
            <tr><td style={{ fontWeight: 700 }}>Toplam bedel</td><td style={{ textAlign: "right", fontWeight: 700 }}>{formatTL(f.toplamBedel)}</td></tr>
            <tr><td>Alınan ödemeler</td><td style={{ textAlign: "right" }}>{formatTL(f.alinan)}</td></tr>
            <tr><td>Kalan alacak</td><td style={{ textAlign: "right" }}>{formatTL(f.kalan)}</td></tr>
            <tr><td colSpan={2} style={{ height: 6, border: 0 }} /></tr>
            <tr><td>Net satış (KDV hariç)</td><td style={{ textAlign: "right" }}>{formatTL(f.netSatis)}</td></tr>
            <tr><td>Tekliflenen maliyet</td><td style={{ textAlign: "right" }}>{formatTL(f.tahminiMaliyet)}</td></tr>
            <tr><td>Gerçek harcama</td><td style={{ textAlign: "right" }}>{formatTL(f.gercekMaliyet)}</td></tr>
            <tr style={{ background: "#f1f4f9" }}><td style={{ fontWeight: 800 }}>NET KAZANÇ (net satış − harcama)</td><td style={{ textAlign: "right", fontWeight: 800 }}>{formatTL(f.gercekKar)} · %{formatSayi(f.gercekKarYuzde, 1)}</td></tr>
            <tr><td>Kasa (alınan − yapılan ödeme)</td><td style={{ textAlign: "right" }}>{formatTL(f.alinan - f.gercekMaliyet)}</td></tr>
          </tbody>
        </table>

        {onayliEk.length > 0 && (
          <div className="keep" style={{ marginBottom: 14 }}>
            <div className="band"><span>EK İŞLER</span></div>
            <table className="tbl" style={{ marginTop: 6 }}><tbody>{onayliEk.map((e) => <tr key={e.id}><td>{formatTarih(e.tarih)}</td><td>{e.baslik}</td><td style={{ textAlign: "right" }}>{formatTL(e.tutar)}</td></tr>)}</tbody></table>
          </div>
        )}

        <div className="keep" style={{ marginBottom: 14 }}>
          <div className="band"><span>ALINAN ÖDEMELER</span><span>{formatTL(f.alinan)}</span></div>
          <table className="tbl" style={{ marginTop: 6 }}>
            <thead><tr><th style={{ width: 90 }}>Tarih</th><th>Açıklama</th><th style={{ width: 90 }}>Şekil</th><th style={{ width: 120, textAlign: "right" }}>Tutar</th></tr></thead>
            <tbody>{payments.length === 0 ? <tr><td colSpan={4} style={{ color: "#6580ad" }}>Kayıt yok</td></tr> : payments.map((p) => <tr key={p.id}><td>{formatTarih(p.tarih)}</td><td>{p.aciklama}</td><td>{({ nakit: "Nakit", havale: "Havale", kart: "Kart", cek: "Çek" } as const)[p.sekil]}</td><td style={{ textAlign: "right" }}>{formatTL(p.tutar)}</td></tr>)}</tbody>
          </table>
        </div>

        <div className="keep">
          <div className="band"><span>YAPILAN ÖDEMELER (HARCAMALAR)</span><span>{formatTL(f.gercekMaliyet)}</span></div>
          <table className="tbl" style={{ marginTop: 6 }}>
            <thead><tr><th style={{ width: 90 }}>Tarih</th><th>Ödeme yapılan yer</th><th style={{ width: 120 }}>Kategori</th><th style={{ width: 120, textAlign: "right" }}>Tutar</th></tr></thead>
            <tbody>
              {expenses.length === 0 ? <tr><td colSpan={4} style={{ color: "#6580ad" }}>Kayıt yok</td></tr> : expenses.map((e) => <tr key={e.id}><td>{formatTarih(e.tarih)}</td><td>{[e.tedarikci, e.aciklama].filter(Boolean).join(" — ")}</td><td>{GIDER_KATEGORI_ETIKET[e.kategori]}</td><td style={{ textAlign: "right" }}>{formatTL(e.tutar)}</td></tr>)}
              {kategoriler.length > 0 && <tr style={{ background: "#f1f4f9" }}><td colSpan={4} style={{ fontSize: "9pt" }}>{kategoriler.map((k) => `${GIDER_KATEGORI_ETIKET[k]}: ${formatTL(f.harcamaKategori[k])}`).join("   ·   ")}</td></tr>}
            </tbody>
          </table>
        </div>
        <SheetFooter settings={settings} right="İş dosyası" />
      </div>
    </div>
  );
}

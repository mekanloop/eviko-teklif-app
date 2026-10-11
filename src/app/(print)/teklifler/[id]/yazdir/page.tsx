"use client";

import { useParams } from "next/navigation";
import { InfoGrid, Letterhead, PrintToolbar, SheetFooter, SignatureBlocks } from "@/components/print";
import { Loading } from "@/components/ui";
import { useCatalog, useCustomer, usePayments, useQuote, useSettings } from "@/lib/data/hooks";
import { quoteTitle } from "@/lib/data/quote-ops";
import { calcOption, catalogFor } from "@/lib/engine/calc";
import { formatTL } from "@/lib/engine/money";
import { formatTarih, renderItemText, renderSablon } from "@/lib/engine/text";
import { TUR_ETIKET } from "@/lib/types";

export default function QuotePrintPage() {
  const { id } = useParams<{ id: string }>();
  const quote = useQuote(id);
  const settings = useSettings();
  const customer = useCustomer(quote?.customerId ?? "");
  const catalog = useCatalog();
  const payments = usePayments(quote?.projectId ?? "");
  if (!quote || !settings || !catalog || !payments) return <Loading />;

  const cat = catalogFor(quote.dondurulmus, catalog);
  const sonuclar = quote.secenekler.map((o) => ({ o, r: calcOption(quote, o, catalog) }));
  const coklu = quote.secenekler.length > 1;
  const secili = sonuclar.find((s) => s.o.id === quote.secilenSecenekId)?.r ?? (coklu ? undefined : sonuclar[0]?.r);
  const taslakFiligrani = quote.durum === "taslak";
  const degiskenler = { gecerlilik: quote.gecerlilikGun, iseBaslama: quote.iseBaslama, teslim: quote.teslimIsGunu };
  const satirFiltrele = (liste: string[]) =>
    liste
      .filter((s) => s.trim())
      .filter((s) => !(s.includes("{iseBaslama}") && !quote.iseBaslama) && !(s.includes("{teslim}") && quote.teslimIsGunu == null))
      .map((s) => renderSablon(s, degiskenler));
  const notlar = satirFiltrele(quote.notlar);
  const sartlar = satirFiltrele(quote.sartlar);
  const fiyatNotu = quote.kdvModu === "nakitKdvHaric" ? "Fiyat nakit ödeme içindir ve KDV hariçtir." : `Fiyatlar KDV hariç olup %${quote.kdvOrani} KDV toplama ayrıca eklenmiştir.`;
  const toplamEtiket = quote.kdvModu === "nakitKdvHaric" ? "GENEL TOPLAM (NAKİT, KDV HARİÇ)" : "GENEL TOPLAM (KDV DAHİL)";
  const onayli = quote.durum === "onaylandi";
  const bos = 7;
  const odemeSatirlari = onayli ? payments : [];
  const alinan = odemeSatirlari.reduce((a, p) => a + p.tutar, 0);
  const planToplam = secili?.genelToplam;

  const bilgi: Array<[string, React.ReactNode]> = [
    ["Sayın", customer?.ad ?? "—"],
    ["Konu", quote.konu],
    ["Teklif türü", quoteTitle(quote)],
  ];
  if (quote.iseBaslama) bilgi.push(["İşe başlangıç tarihi", formatTarih(quote.iseBaslama)]);
  if (quote.teslimIsGunu != null) bilgi.push(["Teslim süresi", `${quote.teslimIsGunu} iş günü`]);
  bilgi.push(["Teklif geçerliliği", `${quote.gecerlilikGun} gün`]);

  return (
    <div style={{ background: "#e9edf4", minHeight: "100vh" }}>
      <PrintToolbar backHref={`/teklifler/${quote.id}`} backLabel="Teklife dön" />
      {taslakFiligrani && <div className="no-print mx-auto max-w-[210mm] px-4 pt-3 text-center text-xs font-semibold text-amber-700">Bu teklif henüz taslak. Müşteriye göndermeden önce “Gönderildi yap”ın.</div>}

      {/* Sayfa 1: Kapsam */}
      <div className="sheet">
        <Letterhead settings={settings} title={TUR_ETIKET[quote.tur].toLocaleUpperCase("tr")} lines={[`Teklif No: ${quote.no}`, `Tarih: ${formatTarih(quote.tarih)}`]} />
        <InfoGrid rows={bilgi} />

        {coklu && (
          <div className="keep" style={{ margin: "0 0 14px" }}>
            <div className="band"><span>SEÇENEKLER</span></div>
            <table className="tbl" style={{ marginTop: 6 }}>
              <thead><tr><th>Seçenek</th><th style={{ textAlign: "right", width: 180 }}>{quote.kdvModu === "kdvli" ? "Toplam (KDV dahil)" : "Toplam (nakit, KDV hariç)"}</th></tr></thead>
              <tbody>
                {sonuclar.map(({ o, r }) => (
                  <tr key={o.id}><td style={{ fontWeight: 700 }}>{o.ad}{quote.secilenSecenekId === o.id ? "  ✓ seçildi" : ""}</td><td style={{ textAlign: "right", fontWeight: 800 }}>{formatTL(r.genelToplam)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sonuclar.map(({ o, r }, oi) => (
          <div key={o.id} style={oi > 0 ? { breakBefore: "page", paddingTop: "4mm" } : undefined}>
            {coklu && <div style={{ fontSize: "13pt", fontWeight: 800, color: "#b08d57", margin: "4px 0 8px", letterSpacing: "0.04em" }}>SEÇENEK: {o.ad.toLocaleUpperCase("tr")}</div>}
            {o.mekanlar.map((m, mi) => {
              const aktif = m.kalemler.filter((k) => k.aktif);
              const mr = r.mekanlar.find((x) => x.id === m.id);
              return (
                <div key={m.id} className="keep">
                  <div className="band">
                    <span>{mi + 1}. {m.ad.toLocaleUpperCase("tr")} — KOMPLE YENİLEME</span>
                    {quote.mekanToplamGoster && mr && <span>{formatTL(mr.musteriTutar)}</span>}
                  </div>
                  <ul className="bullets">
                    {aktif.map((k) => {
                      const t = renderItemText(k, m, cat);
                      return t ? <li key={k.id}>{t}</li> : null;
                    })}
                    {settings.mekanKapanisMetni && <li>{settings.mekanKapanisMetni}</li>}
                  </ul>
                </div>
              );
            })}
            <div className="keep" style={{ marginTop: 6 }}>
              {quote.kdvModu === "kdvli" && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, fontSize: "10pt", padding: "2px 12px" }}>
                  <span>KDV hariç: <b>{formatTL(r.net)}</b></span><span>KDV %{quote.kdvOrani}: <b>{formatTL(r.kdv)}</b></span>
                </div>
              )}
              <div className="band" style={{ alignItems: "center", padding: "10px 12px" }}>
                <span>{toplamEtiket}</span>
                <span style={{ fontSize: "15pt", fontWeight: 800 }}>{formatTL(r.genelToplam)}</span>
              </div>
            </div>
          </div>
        ))}

        <div className="keep" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, fontSize: "10pt", letterSpacing: "0.04em" }}>ÖNEMLİ NOTLAR</div>
          <ul className="bullets">
            {[fiyatNotu, ...notlar].map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
        <SheetFooter settings={settings} right={quote.no} />
      </div>

      {/* Sayfa 2: Ödeme planı ve şartlar */}
      <div className="sheet">
        <Letterhead settings={settings} title={TUR_ETIKET[quote.tur].toLocaleUpperCase("tr")} lines={[`Teklif No: ${quote.no}`, `Tarih: ${formatTarih(quote.tarih)}`]} />
        <div style={{ fontWeight: 800, color: "#1b2a4a", fontSize: "12pt", marginBottom: 6 }}>ÖDEME PLANI VE ALINAN ÖDEMELER</div>
        <p style={{ margin: "0 0 10px" }}>
          {planToplam != null
            ? <>Toplam sözleşme bedeli <b>{formatTL(planToplam)}</b> ({quote.kdvModu === "nakitKdvHaric" ? "KDV hariç, nakit fiyatı" : "KDV dahil"}) olup, ödemeler iş takvimine göre aşağıdaki plana göre yapılır ve tabloya işlenerek takip edilir.</>
            : <>Ödeme planı, müşterinin seçeceği seçeneğin toplam bedeline göre uygulanır; tutarlar onay sonrası kesinleşir.</>}
        </p>

        {quote.odemePlani.length > 0 && (
          <table className="tbl keep" style={{ marginBottom: 14 }}>
            <thead><tr><th>Aşama</th><th style={{ width: 60, textAlign: "right" }}>Oran</th><th style={{ width: 150, textAlign: "right" }}>Tutar</th></tr></thead>
            <tbody>
              {quote.odemePlani.map((p) => (
                <tr key={p.id}><td>{p.ad}</td><td style={{ textAlign: "right" }}>%{p.yuzde}</td><td style={{ textAlign: "right", fontWeight: 700 }}>{planToplam != null ? formatTL(Math.round((planToplam * p.yuzde) / 100)) : "—"}</td></tr>
              ))}
            </tbody>
          </table>
        )}

        <table className="tbl keep" style={{ marginBottom: 12 }}>
          <tbody>
            <tr><td style={{ background: "#f1f4f9", fontWeight: 700 }}>Sözleşme toplam bedeli</td><td style={{ background: "#f1f4f9", fontWeight: 800, textAlign: "right" }}>{planToplam != null ? formatTL(planToplam) : "______________ ₺"}</td></tr>
            <tr><td>Toplam alınan ödeme</td><td style={{ textAlign: "right" }}>{onayli ? formatTL(alinan) : "______________ ₺"}</td></tr>
            <tr><td>Kalan bakiye</td><td style={{ textAlign: "right" }}>{onayli && planToplam != null ? formatTL(planToplam - alinan) : "______________ ₺"}</td></tr>
          </tbody>
        </table>

        <div className="band" style={{ marginBottom: 6 }}><span>ALINAN ÖDEMELER TABLOSU</span></div>
        <table className="tbl keep">
          <thead><tr><th style={{ width: 90 }}>Tarih</th><th>Açıklama</th><th style={{ width: 110, textAlign: "right" }}>Tutar (₺)</th><th style={{ width: 90 }}>Şekil</th><th style={{ width: 90 }}>İmza</th></tr></thead>
          <tbody>
            {Array.from({ length: Math.max(bos, odemeSatirlari.length) }).map((_, i) => {
              const p = odemeSatirlari[i];
              return (
                <tr key={i}>
                  <td>{p ? formatTarih(p.tarih) : ""}</td><td>{p?.aciklama ?? ""}</td><td style={{ textAlign: "right" }}>{p ? formatTL(p.tutar, { sembol: false }) : ""}</td><td>{p ? ({ nakit: "Nakit", havale: "Havale", kart: "Kart", cek: "Çek" } as const)[p.sekil] : ""}</td>
                  <td>{p?.imza && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imza} alt="" style={{ maxHeight: 22 }} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: "8.5pt", color: "#6580ad", textAlign: "center", margin: "6px 0 14px" }}>Bu tablo iş süreci boyunca yapılan her ödemede doldurulur ve ilgili taraflarca imzalanır.</p>

        <div className="keep">
          <div className="band"><span>GENEL ŞARTLAR</span></div>
          <ul className="bullets">{sartlar.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>

        <SignatureBlocks left={settings.firmaAd} right={`MÜŞTERİ (${customer?.ad ?? ""})`} />
        <SheetFooter settings={settings} right={quote.no} />
      </div>
    </div>
  );
}

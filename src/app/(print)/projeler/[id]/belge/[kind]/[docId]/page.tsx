"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "next/navigation";
import { InfoGrid, Letterhead, PrintToolbar, SheetFooter, SignatureBlocks } from "@/components/print";
import { Loading } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { useCustomer, useProject, useSettings } from "@/lib/data/hooks";
import { formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";

type Kind = "mal-teslim" | "is-teslim" | "ek-is";

export default function DocPrintPage() {
  const { id, kind, docId } = useParams<{ id: string; kind: Kind; docId: string }>();
  const settings = useSettings();
  const project = useProject(id);
  const customer = useCustomer(project?.customerId ?? "");
  const doc = useLiveQuery(async () => {
    const db = getDb();
    if (kind === "mal-teslim") return (await db.deliveries.get(docId)) ?? null;
    if (kind === "is-teslim") return (await db.handovers.get(docId)) ?? null;
    return (await db.extraJobs.get(docId)) ?? null;
  }, [kind, docId]);

  if (!settings || !project || doc === undefined) return <Loading />;
  if (doc === null) return <div className="p-8 text-center">Belge bulunamadı.</div>;

  const baslik = kind === "mal-teslim" ? "MAL TESLİM FORMU" : kind === "is-teslim" ? "İŞ TESLİM TUTANAĞI" : "EK İŞ FORMU";
  const tarih = (doc as { tarih: string }).tarih;

  return (
    <div style={{ background: "#e9edf4", minHeight: "100vh" }}>
      <PrintToolbar backHref={`/projeler/${id}`} backLabel="Projeye dön" />
      <div className="sheet">
        <Letterhead settings={settings} title={baslik} lines={[`Tarih: ${formatTarih(tarih)}`]} />
        <InfoGrid
          rows={[
            ["Müşteri", customer?.ad ?? "—"],
            ["Proje", project.ad],
            ["İş adresi", project.adres || "—"],
            ...(kind !== "ek-is" ? ([["Teslim alan", (doc as { teslimAlan: string }).teslimAlan || "—"]] as Array<[string, string]>) : []),
          ]}
        />

        {kind === "mal-teslim" && (() => {
          const d = doc as import("@/lib/types").Delivery;
          return (
            <>
              <p style={{ margin: "0 0 8px" }}>Aşağıda belirtilen malzemeler eksiksiz ve hasarsız olarak teslim edilmiş / teslim alınmıştır.</p>
              <table className="tbl">
                <thead><tr><th style={{ width: 28 }}>#</th><th>Malzeme</th><th style={{ width: 130 }}>Miktar</th><th style={{ width: 70 }}>Teslim</th><th style={{ width: 150 }}>Not</th></tr></thead>
                <tbody>
                  {d.satirlar.map((s, i) => (
                    <tr key={s.id}><td>{i + 1}</td><td>{s.ad}</td><td>{s.miktar}</td><td style={{ textAlign: "center", fontWeight: 800 }}>{s.teslimEdildi ? "✓" : "—"}</td><td>{s.not}</td></tr>
                  ))}
                </tbody>
              </table>
              {d.not && <p style={{ marginTop: 10 }}><b>Not:</b> {d.not}</p>}
              <SignatureBlocks left={`TESLİM EDEN — ${settings.firmaAd}`} right={`TESLİM ALAN — ${d.teslimAlan || customer?.ad || ""}`} rightImage={d.imza} />
            </>
          );
        })()}

        {kind === "is-teslim" && (() => {
          const d = doc as import("@/lib/types").Handover;
          return (
            <>
              <p style={{ margin: "0 0 8px" }}>Sözleşme kapsamındaki işler kontrol edilmiş olup aşağıdaki durumda teslim edilmiştir.</p>
              <table className="tbl">
                <thead><tr><th style={{ width: 28 }}>#</th><th>İş kalemi</th><th style={{ width: 80 }}>Durum</th><th style={{ width: 200 }}>Not</th></tr></thead>
                <tbody>
                  {d.satirlar.map((s, i) => (
                    <tr key={s.id}><td>{i + 1}</td><td>{s.ad}</td><td style={{ textAlign: "center", fontWeight: 700 }}>{s.tamam ? "Tamam" : "Eksik"}</td><td>{s.not}</td></tr>
                  ))}
                </tbody>
              </table>
              {d.eksikler && <p style={{ marginTop: 10 }}><b>Eksik / kusurlar:</b> {d.eksikler}</p>}
              {d.not && <p style={{ marginTop: 6 }}><b>Not:</b> {d.not}</p>}
              <SignatureBlocks left={`TESLİM EDEN — ${settings.firmaAd}`} right={`TESLİM ALAN — ${d.teslimAlan || customer?.ad || ""}`} rightImage={d.imza} />
            </>
          );
        })()}

        {kind === "ek-is" && (() => {
          const d = doc as import("@/lib/types").ExtraJob;
          return (
            <>
              <div className="band"><span>{d.baslik.toLocaleUpperCase("tr")}</span></div>
              <p style={{ whiteSpace: "pre-wrap", margin: "10px 0" }}>{d.aciklama || "—"}</p>
              <table className="tbl" style={{ marginTop: 8 }}>
                <tbody>
                  <tr><td style={{ background: "#f1f4f9", fontWeight: 700 }}>Ek iş bedeli (KDV hariç, nakit)</td><td style={{ background: "#f1f4f9", fontWeight: 800, textAlign: "right", width: 180 }}>{formatTL(d.tutar)}</td></tr>
                  <tr><td>Durum</td><td style={{ textAlign: "right" }}>{({ bekliyor: "Onay bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi" } as const)[d.durum]}</td></tr>
                </tbody>
              </table>
              <p style={{ marginTop: 10, fontSize: "9.5pt", color: "#44608f" }}>Bu ek iş, ana sözleşme bedeline ilave olup onaylandığı tarihten itibaren toplam sözleşme bedeline dahil edilir.</p>
              <SignatureBlocks left={settings.firmaAd} right={`MÜŞTERİ (${customer?.ad ?? ""})`} rightImage={d.imza} />
            </>
          );
        })()}
        <SheetFooter settings={settings} right={baslik} />
      </div>
    </div>
  );
}

import type { ExtraJob, Expense, Kurus, Payment } from "../types";
import type { OptionResult } from "./calc";

export interface ProjectFinance {
  /** Onaylı teklif genel toplamı (KDV dahil/hariç teklifteki haliyle) */
  sozlesme: Kurus;
  /** Onaylı ek işlerin toplamı */
  ekIsler: Kurus;
  toplamBedel: Kurus;
  alinan: Kurus;
  kalan: Kurus;
  /** Tekliflenen maliyet (onaylı teklif maliyeti + onaylı ek iş maliyeti) */
  tahminiMaliyet: Kurus;
  /** Girilen gerçek harcamalar */
  gercekMaliyet: Kurus;
  harcamaKategori: Record<Expense["kategori"], Kurus>;
  /** KDV hariç net satış (kâr hesabı için) */
  netSatis: Kurus;
  tahminiKar: Kurus;
  gercekKar: Kurus;
  gercekKarYuzde: number;
}

export function projectFinance(
  secili: OptionResult | undefined,
  ekIsler: ExtraJob[],
  odemeler: Payment[],
  harcamalar: Expense[],
): ProjectFinance {
  const onayliEk = ekIsler.filter((e) => e.durum === "onaylandi");
  const ekToplam = onayliEk.reduce((a, e) => a + e.tutar, 0);
  const ekMaliyet = onayliEk.reduce((a, e) => a + e.maliyet, 0);
  const sozlesme = secili?.genelToplam ?? 0;
  const toplamBedel = sozlesme + ekToplam;
  const alinan = odemeler.reduce((a, p) => a + p.tutar, 0);
  const netSatis = (secili?.net ?? 0) + ekToplam;
  const tahminiMaliyet = (secili?.maliyet ?? 0) + ekMaliyet;
  const harcamaKategori: ProjectFinance["harcamaKategori"] = { malzeme: 0, iscilik: 0, nakliye: 0, yemek: 0, yakit: 0, diger: 0 };
  for (const h of harcamalar) harcamaKategori[h.kategori] += h.tutar;
  const gercekMaliyet = harcamalar.reduce((a, h) => a + h.tutar, 0);
  const gercekKar = netSatis - gercekMaliyet;
  return {
    sozlesme,
    ekIsler: ekToplam,
    toplamBedel,
    alinan,
    kalan: toplamBedel - alinan,
    tahminiMaliyet,
    gercekMaliyet,
    harcamaKategori,
    netSatis,
    tahminiKar: netSatis - tahminiMaliyet,
    gercekKar,
    gercekKarYuzde: netSatis > 0 ? Math.round((gercekKar / netSatis) * 10000) / 100 : 0,
  };
}

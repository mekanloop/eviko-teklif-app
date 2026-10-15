import type {
  Cabinet,
  Frozen,
  GiderBirimi,
  GiderTanimi,
  Id,
  Kurus,
  LineDef,
  Mekan,
  MekanDolap,
  Product,
  LaborType,
  Quote,
  QuoteItem,
  QuoteOption,
} from "../types";
import { BIRIM_ETIKET } from "../types";
import { odaCm, ogeEkAlan } from "./plan";
import { round2, withMarkup } from "./money";

export interface Catalog {
  urunler: Record<Id, Pick<Product, "netAlis" | "kutuM2" | "ad"> & { tedarikci?: string }>;
  ustalar: Record<Id, Pick<LaborType, "yevmiye" | "ad">>;
  dolaplar?: Record<Id, { fiyatM2: Kurus; ad: string }>;
  giderler?: Record<Id, { ad: string; birim: GiderBirimi; tutar: Kurus; yansit: boolean }>;
}

export function buildCatalog(products: Product[], labor: LaborType[], cabinets: Cabinet[] = [], giderler: GiderTanimi[] = []): Catalog {
  const urunler: Catalog["urunler"] = {};
  for (const p of products) urunler[p.id] = { netAlis: p.netAlis, kutuM2: p.kutuM2, ad: p.ad, tedarikci: p.tedarikci };
  const ustalar: Catalog["ustalar"] = {};
  for (const l of labor) ustalar[l.id] = { yevmiye: l.yevmiye, ad: l.ad };
  const dolaplar: NonNullable<Catalog["dolaplar"]> = {};
  for (const c of cabinets) dolaplar[c.id] = { fiyatM2: c.fiyatM2, ad: c.ad };
  const gdr: NonNullable<Catalog["giderler"]> = {};
  for (const g of giderler) if (g.aktif) gdr[g.id] = { ad: g.ad, birim: g.birim, tutar: g.tutar, yansit: g.yansit };
  return { urunler, ustalar, dolaplar, giderler: gdr };
}

/** Teklif dondurulmuşsa o anki fiyatları, değilse güncel kataloğu kullanır. */
export function catalogFor(frozen: Frozen | undefined, live: Catalog): Catalog {
  if (!frozen) return live;
  return { urunler: frozen.urunler, ustalar: frozen.ustalar, dolaplar: frozen.dolaplar ?? live.dolaplar, giderler: frozen.giderler ?? live.giderler };
}

export function freezeCatalog(quote: Quote, live: Catalog, now: string): Frozen {
  const urunler: Frozen["urunler"] = {};
  const ustalar: Frozen["ustalar"] = {};
  const dolaplar: NonNullable<Frozen["dolaplar"]> = {};
  for (const opt of quote.secenekler)
    for (const m of opt.mekanlar) {
      for (const d of m.dolaplar ?? []) {
        if (d.cabinetId && live.dolaplar?.[d.cabinetId]) dolaplar[d.cabinetId] = live.dolaplar[d.cabinetId];
      }
      for (const it of m.kalemler)
        for (const l of it.satirlar) {
          if (l.productId && live.urunler[l.productId]) urunler[l.productId] = live.urunler[l.productId];
          if (l.laborTypeId && live.ustalar[l.laborTypeId]) ustalar[l.laborTypeId] = live.ustalar[l.laborTypeId];
        }
    }
  return { tarih: now, urunler, ustalar, dolaplar, giderler: live.giderler };
}

/* -------------------------------- Ölçüler --------------------------------- */

export interface Olculer {
  zemin: number;
  duvar: number;
  toplam: number;
  tavan: number;
  cevre: number;
}

const n0 = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : 0);

export function olculer(m: Pick<Mekan, "en" | "boy" | "yukseklik" | "dusumM2" | "zeminOverride" | "duvarOverride"> & { ogeler?: Mekan["ogeler"] }): Olculer {
  const en = n0(m.en);
  const boy = n0(m.boy);
  const yuk = n0(m.yukseklik);
  const zeminElle = m.zeminOverride != null && m.zeminOverride > 0;
  const duvarElle = m.duvarOverride != null && m.duvarOverride > 0;
  // Ek duvar / çıkıntılar: sadece "m²'ye yansıt" işaretliyse ve m² elle girilmemişse
  let ekDuvar = 0;
  let ekZemin = 0;
  const { W, H } = odaCm({ en: m.en, boy: m.boy });
  for (const o of m.ogeler ?? []) {
    if (!o.m2Ekle || (o.tur !== "duvar" && o.tur !== "cikinti")) continue;
    const a = ogeEkAlan(o, W, H, yuk);
    ekDuvar += a.duvarM2;
    ekZemin += a.zeminM2;
  }
  const zemin = round2(zeminElle ? m.zeminOverride! : Math.max(0, en * boy - ekZemin));
  const cevre = round2(2 * (en + boy));
  const duvarHesap = Math.max(0, cevre * yuk - n0(m.dusumM2) + ekDuvar);
  const duvar = round2(duvarElle ? m.duvarOverride! : duvarHesap);
  return { zemin, duvar, toplam: round2(zemin + duvar), tavan: zemin, cevre };
}

/* ------------------------------ Satır hesabı ------------------------------- */

export interface LineResult {
  id: Id;
  kind: LineDef["kind"];
  label: string;
  /** Gösterim için miktar ve birim (örn. "12,4 m²" veya "3 gün") */
  miktar: number;
  birim: string;
  /** Kutuya yuvarlandıysa satın alınan kutu sayısı */
  kutu?: number;
  birimMaliyet: Kurus;
  maliyet: Kurus;
  satis: Kurus;
  eksikFiyat: boolean;
}

export interface ItemResult {
  id: Id;
  ad: string;
  aktif: boolean;
  satirlar: LineResult[];
  maliyet: Kurus;
  malzemeMaliyet: Kurus;
  iscilikMaliyet: Kurus;
  satis: Kurus;
  eksikFiyat: number;
}

export interface DolapResult {
  id: Id;
  ad: string;
  aktif: boolean;
  m2: number;
  fiyatM2: Kurus;
  maliyet: Kurus;
  satis: Kurus;
  eksikFiyat: boolean;
}

/** Dolap alanı (m²). Elle girilmediyse ön yüz alanı = genişlik × yükseklik × adet. */
export function dolapM2(d: Pick<MekanDolap, "genislik" | "yukseklik" | "adet" | "m2Override">): number {
  const adet = d.adet > 0 ? d.adet : 1;
  if (d.m2Override != null && d.m2Override > 0) return round2(d.m2Override);
  return round2(((n0(d.genislik) * n0(d.yukseklik)) / 10000) * adet);
}

export function calcDolap(d: MekanDolap, cat: Catalog, karMalzemeYuzde: number): DolapResult {
  const fiyat = d.cabinetId ? (cat.dolaplar?.[d.cabinetId]?.fiyatM2 ?? 0) : 0;
  const m2 = dolapM2(d);
  const maliyet = Math.round(m2 * fiyat);
  return { id: d.id, ad: d.ad, aktif: d.aktif, m2, fiyatM2: fiyat, maliyet, satis: withMarkup(maliyet, karMalzemeYuzde), eksikFiyat: fiyat <= 0 };
}

export interface MekanResult {
  id: Id;
  ad: string;
  olculer: Olculer;
  kalemler: ItemResult[];
  dolaplar: DolapResult[];
  maliyet: Kurus;
  /** Yuvarlama/indirim öncesi satış */
  satis: Kurus;
  /** Müşteriye gösterilecek (indirim ve yuvarlama dağıtılmış) mekan tutarı */
  musteriTutar: Kurus;
}

export interface GiderResult {
  id: Id;
  ad: string;
  birim: GiderBirimi;
  /** Çarpan: toplam adam-gün, iş günü ya da 1 */
  miktar: number;
  birimTutar: Kurus;
  maliyet: Kurus;
  satis: Kurus;
  yansit: boolean;
  /** İş günü bilgisi eksik */
  eksik: boolean;
}

export interface OptionResult {
  id: Id;
  ad: string;
  mekanlar: MekanResult[];
  giderler: GiderResult[];
  giderMaliyet: Kurus;
  giderSatis: Kurus;
  /** Aktif işçilik satırlarındaki toplam adam-gün */
  adamGun: number;
  maliyet: Kurus;
  malzemeMaliyet: Kurus;
  iscilikMaliyet: Kurus;
  satisOnce: Kurus;
  indirim: Kurus;
  yuvarlamaFarki: Kurus;
  /** KDV öncesi müşteri tutarı */
  net: Kurus;
  kdv: Kurus;
  genelToplam: Kurus;
  kar: Kurus;
  karYuzde: number;
  eksikFiyat: number;
}

export interface QuoteSettingsLike {
  karMalzemeYuzde: number;
  karIscilikYuzde: number;
  fireYuzde: number;
  yuvarlamaTL: number;
}

function basisValue(b: LineDef["basis"], o: Olculer): number {
  switch (b) {
    case "zemin": return o.zemin;
    case "duvar": return o.duvar;
    case "toplam": return o.toplam;
    case "tavan": return o.tavan;
    case "cevre": return o.cevre;
    default: return 1;
  }
}

export function calcLine(
  line: LineDef,
  o: Olculer,
  cat: Catalog,
  ayar: QuoteSettingsLike,
): LineResult {
  if (line.kind === "iscilik") {
    const usta = line.laborTypeId ? cat.ustalar[line.laborTypeId] : undefined;
    const gun = n0(line.gun);
    const kisi = line.kisi && line.kisi > 0 ? line.kisi : 1;
    const adamGun = round2(gun * kisi);
    const yevmiye = usta?.yevmiye ?? 0;
    const maliyet = Math.round(adamGun * yevmiye);
    return {
      id: line.id,
      kind: "iscilik",
      label: line.label,
      miktar: adamGun,
      birim: "gün",
      birimMaliyet: yevmiye,
      maliyet,
      satis: withMarkup(maliyet, ayar.karIscilikYuzde),
      eksikFiyat: !usta || yevmiye <= 0,
    };
  }

  const urun = line.productId ? cat.urunler[line.productId] : undefined;
  const birimMaliyet = urun ? urun.netAlis : (line.manuelBirimMaliyet ?? 0);
  const base = line.basis === "sabit" ? n0(line.carpan) : basisValue(line.basis, o) * n0(line.carpan);
  const fire = line.fire ? (line.fireYuzde ?? ayar.fireYuzde) : 0;
  const adj = base * (1 + n0(fire) / 100);
  let miktar = round2(adj);
  let kutu: number | undefined;
  let satinAlinan = miktar;
  const kutuM2 = urun?.kutuM2;
  if (kutuM2 && kutuM2 > 0 && line.birim === "m2") {
    kutu = Math.ceil(adj / kutuM2 - 1e-9);
    satinAlinan = kutu * kutuM2;
    miktar = round2(satinAlinan);
  }
  const maliyet = Math.round(satinAlinan * birimMaliyet);
  return {
    id: line.id,
    kind: "malzeme",
    label: line.label,
    miktar,
    birim: BIRIM_ETIKET[line.birim] ?? line.birim,
    kutu,
    birimMaliyet,
    maliyet,
    satis: withMarkup(maliyet, ayar.karMalzemeYuzde),
    eksikFiyat: birimMaliyet <= 0,
  };
}

export function calcItem(item: QuoteItem, o: Olculer, cat: Catalog, ayar: QuoteSettingsLike): ItemResult {
  const satirlar = item.satirlar.map((l) => calcLine(l, o, cat, ayar));
  let malzemeMaliyet = 0;
  let iscilikMaliyet = 0;
  let satis = 0;
  let eksik = 0;
  for (const s of satirlar) {
    if (s.kind === "malzeme") malzemeMaliyet += s.maliyet;
    else iscilikMaliyet += s.maliyet;
    satis += s.satis;
    if (s.eksikFiyat) eksik++;
  }
  return {
    id: item.id,
    ad: item.ad,
    aktif: item.aktif,
    satirlar,
    maliyet: malzemeMaliyet + iscilikMaliyet,
    malzemeMaliyet,
    iscilikMaliyet,
    satis,
    eksikFiyat: eksik,
  };
}

/**
 * Bir toplamı oranlara göre tam sayı olarak paylaştırır. Son pay kalanı alır, toplam tam tutar.
 * `adim` > 1 ise her pay (son hariç) bu adımın katına yuvarlanır.
 */
export function allocate(total: Kurus, weights: number[], adim = 1): Kurus[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (sum <= 0) {
    const out = weights.map(() => 0);
    out[out.length - 1] = total;
    return out;
  }
  const out: Kurus[] = [];
  let used = 0;
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      out.push(total - used);
    } else {
      const raw = (total * weights[i]) / sum;
      const v = adim > 1 ? Math.round(raw / adim) * adim : Math.round(raw);
      out.push(v);
      used += v;
    }
  }
  return out;
}

export function calcOption(
  quote: Pick<Quote, "kdvModu" | "kdvOrani" | "ayarlar" | "dondurulmus"> & Partial<Pick<Quote, "teslimIsGunu" | "giderKapali">>,
  option: QuoteOption,
  live: Catalog,
): OptionResult {
  const cat = catalogFor(quote.dondurulmus, live);
  const ayar: QuoteSettingsLike = {
    karMalzemeYuzde: quote.ayarlar.karMalzemeYuzde,
    karIscilikYuzde: quote.ayarlar.karIscilikYuzde,
    fireYuzde: quote.ayarlar.fireYuzde,
    yuvarlamaTL: quote.ayarlar.yuvarlamaTL,
  };

  let maliyet = 0;
  let malzemeMaliyet = 0;
  let iscilikMaliyet = 0;
  let satisOnce = 0;
  let eksik = 0;

  const mekanlar: MekanResult[] = option.mekanlar.map((m) => {
    const o = olculer(m);
    const kalemler = m.kalemler.map((it) => calcItem(it, o, cat, ayar));
    let mMaliyet = 0;
    let mSatis = 0;
    for (const k of kalemler) {
      if (!k.aktif) continue;
      mMaliyet += k.maliyet;
      mSatis += k.satis;
      malzemeMaliyet += k.malzemeMaliyet;
      iscilikMaliyet += k.iscilikMaliyet;
      eksik += k.eksikFiyat;
    }
    const dolaplar = (m.dolaplar ?? []).map((d) => calcDolap(d, cat, ayar.karMalzemeYuzde));
    for (const d of dolaplar) {
      if (!d.aktif) continue;
      mMaliyet += d.maliyet;
      mSatis += d.satis;
      malzemeMaliyet += d.maliyet;
      if (d.eksikFiyat) eksik++;
    }
    maliyet += mMaliyet;
    satisOnce += mSatis;
    return { id: m.id, ad: m.ad, olculer: o, kalemler, dolaplar, maliyet: mMaliyet, satis: mSatis, musteriTutar: mSatis };
  });

  // Günlük/sabit giderler (yemek, benzin…)
  let adamGun = 0;
  for (const m of option.mekanlar)
    for (const it of m.kalemler) {
      if (!it.aktif) continue;
      for (const l of it.satirlar) if (l.kind === "iscilik") adamGun += n0(l.gun) * (l.kisi && l.kisi > 0 ? l.kisi : 1);
    }
  adamGun = round2(adamGun);
  const isGunu = n0(quote.teslimIsGunu);
  const kapali = new Set(quote.giderKapali ?? []);
  const giderler: GiderResult[] = Object.entries(cat.giderler ?? {})
    .filter(([id]) => !kapali.has(id))
    .map(([id, g]) => {
      const miktar = g.birim === "kisiGun" ? adamGun : g.birim === "gun" ? isGunu : 1;
      const maliyet = Math.round(miktar * g.tutar);
      return {
        id,
        ad: g.ad,
        birim: g.birim,
        miktar,
        birimTutar: g.tutar,
        maliyet,
        satis: g.yansit ? withMarkup(maliyet, ayar.karIscilikYuzde) : 0,
        yansit: g.yansit,
        eksik: g.birim === "gun" && isGunu <= 0,
      };
    });
  let giderMaliyet = 0;
  let giderSatis = 0;
  for (const g of giderler) {
    giderMaliyet += g.maliyet;
    giderSatis += g.satis;
    if (g.eksik) eksik++;
  }
  maliyet += giderMaliyet;
  satisOnce += giderSatis;

  const indirim = Math.max(0, Math.min(option.indirim || 0, satisOnce));
  const araToplam = satisOnce - indirim;
  const adim = ayar.yuvarlamaTL > 0 ? Math.round(ayar.yuvarlamaTL * 100) : 0;
  const net = adim > 0 ? Math.round(araToplam / adim) * adim : araToplam;
  const yuvarlamaFarki = net - araToplam;

  const paylar = allocate(net, mekanlar.map((m) => m.satis), adim > 1 ? adim : 1);
  mekanlar.forEach((m, i) => (m.musteriTutar = paylar[i]));

  const kdv = quote.kdvModu === "kdvli" ? Math.round((net * quote.kdvOrani) / 100) : 0;
  const kar = net - maliyet;

  return {
    id: option.id,
    ad: option.ad,
    mekanlar,
    giderler,
    giderMaliyet,
    giderSatis,
    adamGun,
    maliyet,
    malzemeMaliyet,
    iscilikMaliyet,
    satisOnce,
    indirim,
    yuvarlamaFarki,
    net,
    kdv,
    genelToplam: net + kdv,
    kar,
    karYuzde: net > 0 ? round2((kar / net) * 100) : 0,
    eksikFiyat: eksik,
  };
}

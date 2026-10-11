import type {
  LineDef,
  Mekan,
  MekanTuru,
  Project,
  Quote,
  QuoteItem,
  QuoteOption,
  QuoteTuru,
  Settings,
  WorkTemplate,
} from "../types";
import { nowIso, todayIso, uid } from "../db/ids";

export function cloneLine(l: LineDef): LineDef {
  return { ...l, id: uid() };
}

export function itemFromTemplate(t: WorkTemplate): QuoteItem {
  return {
    id: uid(),
    templateId: t.id,
    ad: t.ad,
    grup: t.grup,
    metin: t.metin,
    aktif: t.varsayilanAcik,
    satirlar: t.satirlar.map(cloneLine),
  };
}

export function blankItem(): QuoteItem {
  return {
    id: uid(),
    ad: "Serbest kalem",
    grup: "Diğer",
    metin: "",
    aktif: true,
    satirlar: [
      { id: uid(), kind: "malzeme", label: "Malzeme", birim: "goturu", basis: "sabit", carpan: 1, fire: false, manuelBirimMaliyet: 0 },
      { id: uid(), kind: "iscilik", label: "İşçilik", birim: "gun", basis: "sabit", carpan: 1, fire: false, gun: 1, kisi: 1 },
    ],
  };
}

export function newMekan(tur: MekanTuru, ad: string, templates: WorkTemplate[]): Mekan {
  const sablonlar = templates
    .filter((t) => t.mekanTurleri.includes(tur))
    .sort((a, b) => a.sira - b.sira);
  const boyut =
    tur === "wc" ? { en: 1.2, boy: 1.5 } : tur === "banyo" ? { en: 2, boy: 2.5 } : { en: 3, boy: 3 };
  return {
    id: uid(),
    ad,
    tur,
    ...boyut,
    yukseklik: 2.6,
    dusumM2: 0,
    kalemler: sablonlar.map(itemFromTemplate),
  };
}

export function cloneMekan(m: Mekan): Mekan {
  return {
    ...m,
    id: uid(),
    kalemler: m.kalemler.map((k) => ({ ...k, id: uid(), satirlar: k.satirlar.map(cloneLine) })),
  };
}

export function cloneOption(o: QuoteOption, ad: string): QuoteOption {
  return { ...o, id: uid(), ad, mekanlar: o.mekanlar.map(cloneMekan) };
}

export function rootNo(no: string): string {
  return no.replace(/-R\d+$/, "");
}

export function formatQuoteNo(yil: number, sira: number): string {
  return `EV-${yil}-${String(sira).padStart(3, "0")}`;
}

export function newQuote(args: {
  project: Project;
  tur: QuoteTuru;
  yil: number;
  sira: number;
  settings: Settings;
}): Quote {
  const { project, tur, yil, sira, settings: s } = args;
  const id = uid();
  const now = nowIso();
  const notlar = tur === "on" ? s.varsayilanNotlarOn : s.varsayilanNotlarKesin;
  return {
    id,
    customerId: project.customerId,
    projectId: project.id,
    yil,
    sira,
    no: formatQuoteNo(yil, sira),
    rootId: id,
    revNo: 0,
    kesinRevNo: 0,
    tur,
    durum: "taslak",
    tarih: todayIso(),
    gecerlilikGun: s.gecerlilikGun,
    konu: project.ad,
    kdvModu: "nakitKdvHaric",
    kdvOrani: s.kdvOrani,
    mekanToplamGoster: tur === "on",
    ayarlar: {
      karMalzemeYuzde: s.karMalzemeYuzde,
      karIscilikYuzde: s.karIscilikYuzde,
      fireYuzde: s.fireYuzde,
      yuvarlamaTL: s.yuvarlamaTL,
    },
    secenekler: [{ id: uid(), ad: "Standart", mekanlar: [], indirim: 0 }],
    notlar: [...notlar],
    sartlar: [...s.varsayilanSartlar],
    odemePlani: s.varsayilanPlan.map((p) => ({ ...p, id: uid() })),
    olusturuldu: now,
    guncellendi: now,
  };
}

/** Yeni revize: içeriği kopyalar, numarayı -R{n} ile uzatır. */
export function reviseQuoteDoc(q: Quote, opts: { kesineCevir?: boolean; settings?: Settings } = {}): Quote {
  const now = nowIso();
  const revNo = q.revNo + 1;
  const toKesin = opts.kesineCevir && q.tur === "on";
  const tur: QuoteTuru = toKesin ? "kesin" : q.tur;
  const kesinRevNo = toKesin ? 0 : q.tur === "kesin" ? q.kesinRevNo + 1 : 0;
  const idMap = new Map<string, string>();
  const secenekler = q.secenekler.map((o) => {
    const c = cloneOption(o, o.ad);
    idMap.set(o.id, c.id);
    return c;
  });
  const notlar = toKesin && opts.settings ? [...opts.settings.varsayilanNotlarKesin] : [...q.notlar];
  return {
    ...q,
    id: uid(),
    revNo,
    kesinRevNo,
    tur,
    no: `${rootNo(q.no)}-R${revNo}`,
    durum: "taslak",
    tarih: todayIso(),
    mekanToplamGoster: toKesin ? false : q.mekanToplamGoster,
    secenekler,
    secilenSecenekId: undefined,
    notlar,
    sartlar: [...q.sartlar],
    odemePlani: q.odemePlani.map((p) => ({ ...p, id: uid() })),
    dondurulmus: undefined,
    olusturuldu: now,
    guncellendi: now,
  };
}

export function quoteTitle(q: Pick<Quote, "tur" | "revNo" | "kesinRevNo">): string {
  const base = q.tur === "on" ? "Ön Fiyat Teklifi" : "Kesin Fiyat Teklifi";
  const n = q.tur === "kesin" ? q.kesinRevNo : q.revNo;
  return n > 0 ? `${base} (Revize ${n})` : base;
}

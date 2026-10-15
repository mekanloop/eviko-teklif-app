import { describe, expect, it } from "vitest";
import { allocate, calcLine, calcOption, olculer, type Catalog } from "./calc";
import { formatTL, parseSayi, parseTL, withMarkup } from "./money";
import { renderItemText } from "./text";
import type { LineDef, Mekan, Quote, QuoteItem, QuoteOption } from "../types";

const cat: Catalog = {
  urunler: {
    seramik: { ad: "Vitra Rustic 60x60", tedarikci: "Vitra", netAlis: 50000, kutuM2: 1.44 }, // 500 TL/m², kutu 1,44 m²
    klozet: { ad: "Gömme Rezervuarlı Set", netAlis: 1200000 }, // 12.000 TL
  },
  ustalar: { seramikci: { ad: "Seramik ustası", yevmiye: 250000 } }, // 2.500 TL/gün
};
const ayar = { karMalzemeYuzde: 25, karIscilikYuzde: 10, fireYuzde: 10, yuvarlamaTL: 0 };

const mekan = (over: Partial<Mekan> = {}): Mekan => ({
  id: "m1", ad: "Banyo", tur: "banyo", en: 2, boy: 3, yukseklik: 2.5, dusumM2: 2, kalemler: [], ...over,
});

describe("para yardımcıları", () => {
  it("formatlar", () => {
    expect(formatTL(58900000).replace(/\s/g, " ")).toBe("589.000 ₺");
    expect(formatTL(12345)).toBe("123,45 ₺");
  });
  it("Türkçe ve düz sayıyı ayrıştırır", () => {
    expect(parseSayi("1.250,50")).toBe(1250.5);
    expect(parseSayi("1250.5")).toBe(1250.5);
    expect(parseSayi("589.000")).toBe(589000);
    expect(parseSayi("12,5")).toBe(12.5);
    expect(parseSayi("1.5")).toBe(1.5);
    expect(parseSayi("abc")).toBeNull();
    expect(parseTL("1.234,56")).toBe(123456);
  });
  it("yüzde hassasiyeti", () => {
    expect(withMarkup(100000, 25)).toBe(125000);
    expect(withMarkup(100000, 10)).toBe(110000);
    expect(withMarkup(333, 25)).toBe(416);
  });
});

describe("ölçüler", () => {
  it("2x3 banyo, 2.5 yükseklik, 2 m² düşüm", () => {
    const o = olculer(mekan());
    expect(o.zemin).toBe(6);
    expect(o.cevre).toBe(10);
    expect(o.duvar).toBe(23); // 10*2.5 - 2
    expect(o.toplam).toBe(29);
    expect(o.tavan).toBe(6);
  });
  it("elle girilen değer hesaplananı ezer", () => {
    const o = olculer(mekan({ zeminOverride: 42, duvarOverride: 0 }));
    expect(o.zemin).toBe(42);
    expect(o.duvar).toBe(23);
  });
  it("düşüm duvardan büyükse negatif olmaz", () => {
    expect(olculer(mekan({ dusumM2: 999 })).duvar).toBe(0);
  });
});

describe("satır hesabı", () => {
  const o = olculer(mekan());
  const seramik: LineDef = {
    id: "l1", kind: "malzeme", label: "Seramik", productId: "seramik", birim: "m2",
    basis: "toplam", carpan: 1, fire: true,
  };
  it("fire ve kutuya yukarı yuvarlama", () => {
    const r = calcLine(seramik, o, cat, ayar);
    // 29 m² + %10 fire = 31.9 m² -> 31.9 / 1.44 = 22.15 -> 23 kutu -> 33.12 m²
    expect(r.kutu).toBe(23);
    expect(r.miktar).toBe(33.12);
    expect(r.maliyet).toBe(Math.round(33.12 * 50000));
    expect(r.satis).toBe(withMarkup(r.maliyet, 25));
  });
  it("tam kutuya denk gelen miktar fazladan kutu eklemez", () => {
    const r = calcLine({ ...seramik, basis: "sabit", carpan: 14.4, fire: false }, o, cat, ayar);
    expect(r.kutu).toBe(10);
  });
  it("sabit adetli malzeme", () => {
    const r = calcLine(
      { id: "l2", kind: "malzeme", label: "Klozet", productId: "klozet", birim: "takim", basis: "sabit", carpan: 1, fire: false },
      o, cat, ayar,
    );
    expect(r.maliyet).toBe(1200000);
    expect(r.satis).toBe(1500000);
    expect(r.eksikFiyat).toBe(false);
  });
  it("işçilik: yevmiye x gün x kişi, +%10", () => {
    const r = calcLine(
      { id: "l3", kind: "iscilik", label: "Seramik işçiliği", laborTypeId: "seramikci", gun: 3, kisi: 2, birim: "gun", basis: "sabit", carpan: 1, fire: false },
      o, cat, ayar,
    );
    expect(r.maliyet).toBe(3 * 2 * 250000);
    expect(r.satis).toBe(Math.round(3 * 2 * 250000 * 1.1));
  });
  it("fiyatı olmayan ürün eksik fiyat işaretler", () => {
    const r = calcLine(
      { id: "l4", kind: "malzeme", label: "?", birim: "adet", basis: "sabit", carpan: 2, fire: false },
      o, cat, ayar,
    );
    expect(r.eksikFiyat).toBe(true);
    expect(r.maliyet).toBe(0);
  });
});

describe("paylaştırma", () => {
  it("toplam tam tutar çıkar", () => {
    const p = allocate(589000_00, [3, 2, 1]);
    expect(p.reduce((a, b) => a + b, 0)).toBe(589000_00);
  });
  it("adıma yuvarlar, son pay kalanı alır", () => {
    const adim = 1000_00;
    const p = allocate(589000_00, [550, 450], adim);
    expect(p[0] % adim).toBe(0);
    expect(p[0] + p[1]).toBe(589000_00);
  });
});

describe("teklif seçeneği", () => {
  const item = (id: string, lines: LineDef[]): QuoteItem => ({ id, ad: id, grup: "x", metin: "", aktif: true, satirlar: lines });
  const klozetLine: LineDef = { id: "a", kind: "malzeme", label: "Klozet", productId: "klozet", birim: "takim", basis: "sabit", carpan: 1, fire: false };
  const iscilikLine: LineDef = { id: "b", kind: "iscilik", label: "Usta", laborTypeId: "seramikci", gun: 4, kisi: 1, birim: "gun", basis: "sabit", carpan: 1, fire: false };
  const quote = {
    kdvModu: "nakitKdvHaric" as Quote["kdvModu"],
    kdvOrani: 20,
    ayarlar: { ...ayar, karIscilikYuzde: ayar.karIscilikYuzde, yuvarlamaTL: 1000 },
    dondurulmus: undefined,
  };
  const option: QuoteOption = {
    id: "o1", ad: "Standart", indirim: 0,
    mekanlar: [
      mekan({ id: "a", kalemler: [item("i1", [klozetLine, iscilikLine])] }),
      mekan({ id: "b", ad: "WC", kalemler: [item("i2", [klozetLine])] }),
    ],
  };

  it("maliyet, satış, yuvarlama ve kâr", () => {
    const r = calcOption(quote, option, cat);
    const maliyet = 1200000 + 4 * 250000 + 1200000;
    expect(r.maliyet).toBe(maliyet);
    const satis = 1500000 + 1100000 + 1500000; // klozet 15.000 + usta 11.000 + klozet 15.000
    expect(r.satisOnce).toBe(satis);
    expect(r.net).toBe(4100000); // 41.000, 1000 TL katına yuvarlı
    expect(r.yuvarlamaFarki).toBe(4100000 - satis);
    expect(r.mekanlar.reduce((a, m) => a + m.musteriTutar, 0)).toBe(r.net);
    expect(r.kar).toBe(r.net - maliyet);
    expect(r.kdv).toBe(0);
    expect(r.genelToplam).toBe(r.net);
  });
  it("KDV'li modda KDV eklenir", () => {
    const r = calcOption({ ...quote, kdvModu: "kdvli" }, option, cat);
    expect(r.kdv).toBe(Math.round((r.net * 20) / 100));
    expect(r.genelToplam).toBe(r.net + r.kdv);
  });
  it("indirim yuvarlamadan önce düşülür", () => {
    // 41.000 - 3.000 indirim = 38.000 ₺, zaten 1.000 ₺ katı
    const r = calcOption(quote, { ...option, indirim: 300000 }, cat);
    expect(r.indirim).toBe(300000);
    expect(r.net).toBe(3800000);
    // 41.000 - 1.500 = 39.500 ₺ -> en yakın 1.000 ₺ katına 40.000 ₺
    expect(calcOption(quote, { ...option, indirim: 150000 }, cat).net).toBe(4000000);
  });
  it("pasif kalem toplamı etkilemez", () => {
    const kapali = { ...option, mekanlar: [{ ...option.mekanlar[0], kalemler: [{ ...option.mekanlar[0].kalemler[0], aktif: false }] }, option.mekanlar[1]] };
    const r = calcOption(quote, kapali, cat);
    expect(r.maliyet).toBe(1200000);
  });
  it("dondurulmuş katalog güncel fiyatı yok sayar", () => {
    const frozen = { tarih: "2026-10-01", urunler: { klozet: { netAlis: 1000000, ad: "x" } }, ustalar: { seramikci: { yevmiye: 200000, ad: "y" } } };
    const live: Catalog = { urunler: { klozet: { netAlis: 9999999, ad: "x" } }, ustalar: { seramikci: { yevmiye: 999999, ad: "y" } } };
    const r = calcOption({ ...quote, dondurulmus: frozen }, option, live);
    expect(r.maliyet).toBe(1000000 + 4 * 200000 + 1000000);
  });
});

describe("müşteri metni", () => {
  it("yer tutucuları doldurur", () => {
    const m = mekan({ zeminOverride: 20, duvarOverride: 22 });
    const it: QuoteItem = {
      id: "i", ad: "Seramik", grup: "Kaplama", aktif: true,
      metin: "Zemin ve duvar (toplam yaklaşık {toplam} m²) {urun} ile yenilenmesi.",
      satirlar: [
        { id: "x", kind: "malzeme", label: "s", productId: "seramik", birim: "m2", basis: "toplam", carpan: 1, fire: true, metindeGoster: true },
        { id: "y", kind: "malzeme", label: "yapıştırıcı", productId: "klozet", birim: "adet", basis: "sabit", carpan: 1, fire: false },
      ],
    };
    // {urun}: sadece "metinde göster" işaretli satırın ürünü (yapıştırıcı vb. girmez)
    expect(renderItemText(it, m, cat)).toBe("Zemin ve duvar (toplam yaklaşık 42 m²) Vitra Rustic 60x60 ile yenilenmesi.");
    expect(renderItemText({ ...it, metin: "Zemin ve duvar {marka} seramik ile yenilenir." }, m, cat)).toBe("Zemin ve duvar Vitra seramik ile yenilenir.");
  });
  it("ürün seçilmediyse boş yer tutucuyu temizler", () => {
    const it: QuoteItem = { id: "i", ad: "S", grup: "g", aktif: true, metin: "Seramik ({urun}) yenilenir.", satirlar: [] };
    expect(renderItemText(it, mekan(), cat)).toBe("Seramik yenilenir.");
  });
});

describe("günlük giderler (yemek, benzin)", () => {
  const catG: Catalog = {
    urunler: {},
    ustalar: { usta: { ad: "Usta", yevmiye: 500000 } },
    giderler: {
      yemek: { ad: "Yemek", birim: "kisiGun", tutar: 30000, yansit: true },
      benzin: { ad: "Benzin", birim: "gun", tutar: 50000, yansit: false },
    },
  };
  const q = { kdvModu: "nakitKdvHaric" as const, kdvOrani: 20, ayarlar: { karMalzemeYuzde: 25, karIscilikYuzde: 10, fireYuzde: 10, yuvarlamaTL: 0 }, dondurulmus: undefined, teslimIsGunu: 10 };
  const isc: LineDef = { id: "i", kind: "iscilik", label: "Usta", laborTypeId: "usta", gun: 4, kisi: 2, birim: "gun", basis: "sabit", carpan: 1, fire: false };
  const opt: QuoteOption = {
    id: "o", ad: "S", indirim: 0,
    mekanlar: [{ id: "m", ad: "B", tur: "banyo", en: 2, boy: 2, yukseklik: 2.5, dusumM2: 0, kalemler: [{ id: "k", ad: "K", grup: "g", metin: "", aktif: true, satirlar: [isc] }] }],
  };
  it("yemek = adam-gün x tutar, benzin = iş günü x tutar", () => {
    const r = calcOption(q, opt, catG);
    expect(r.adamGun).toBe(8);
    const yemek = r.giderler.find((g) => g.id === "yemek")!;
    const benzin = r.giderler.find((g) => g.id === "benzin")!;
    expect(yemek.maliyet).toBe(8 * 30000);
    expect(benzin.maliyet).toBe(10 * 50000);
    // işçilik 8 adam-gün x 5.000 = 40.000 TL
    expect(r.iscilikMaliyet).toBe(4000000);
    expect(r.giderMaliyet).toBe(240000 + 500000);
    expect(r.maliyet).toBe(4000000 + 740000);
  });
  it("sadece 'yansıt' açık olan gider satışa girer (işçilik kârıyla)", () => {
    const r = calcOption(q, opt, catG);
    expect(r.giderSatis).toBe(Math.round(240000 * 1.1)); // benzin yansımaz
    expect(r.satisOnce).toBe(Math.round(4000000 * 1.1) + Math.round(240000 * 1.1));
  });
  it("teklifte kapatılan gider hesaba girmez", () => {
    const r = calcOption({ ...q, giderKapali: ["benzin"] }, opt, catG);
    expect(r.giderler.map((g) => g.id)).toEqual(["yemek"]);
    expect(r.giderMaliyet).toBe(240000);
  });
  it("iş günü yoksa günlük gider eksik işaretlenir", () => {
    const r = calcOption({ ...q, teslimIsGunu: undefined }, opt, catG);
    const benzin = r.giderler.find((g) => g.id === "benzin")!;
    expect(benzin.eksik).toBe(true);
    expect(benzin.maliyet).toBe(0);
    expect(r.eksikFiyat).toBe(1);
  });
});

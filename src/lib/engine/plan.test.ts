import { describe, expect, it } from "vitest";
import { dolapM2, calcDolap, calcOption, olculer, type Catalog } from "./calc";
import { clampOge, duvaraYasla, enYakinDuvar, ogeEkAlan, odaCm, ogeBoyut, snap, yeniOge } from "./plan";
import { aciPromptlari, masterSartname } from "./prompt";
import type { Mekan, PlanOge, Product, Quote } from "../types";

const mekan = (over: Partial<Mekan> = {}): Mekan => ({
  id: "m", ad: "Banyo", tur: "banyo", en: 2, boy: 3, yukseklik: 2.6, dusumM2: 0, kalemler: [], ...over,
});

describe("kroki geometrisi", () => {
  it("oda cm'e çevrilir", () => expect(odaCm(mekan())).toEqual({ W: 200, H: 300 }));
  it("döndürme genişlik ve yüksekliği değiştirir", () => {
    expect(ogeBoyut({ w: 40, h: 70, rot: 90 })).toEqual({ w: 70, h: 40 });
    expect(ogeBoyut({ w: 40, h: 70, rot: 180 })).toEqual({ w: 40, h: 70 });
  });
  it("oda dışına çıkamaz", () => {
    const o = clampOge({ x: 190, y: -5, w: 40, h: 70, rot: 0 as const }, 200, 300);
    expect(o.x).toBe(160);
    expect(o.y).toBe(0);
  });
  it("5 cm'e yapışır", () => expect(snap(52)).toBe(50));
  it("en yakın duvarı bulur", () => {
    const o: PlanOge = { id: "o", tur: "klozet", ad: "Klozet", x: 100, y: 2, w: 40, h: 70, rot: 0 };
    const y = enYakinDuvar(o, 200, 300);
    expect(y.duvar).toBe("ust");
    expect(y.bosluk).toBe(2);
    expect(y.boyunca).toBe(100);
  });
  it("yeni öğe ortada doğar", () => {
    const o = yeniOge("lavabo", 200, 300, () => "id");
    expect(o.x).toBe(70);
    expect(o.y).toBe(130); // (300-45)/2=127,5 -> 5 cm'e yapışır
  });
});

describe("dolap m² ve maliyet", () => {
  const cat: Catalog = { urunler: {}, ustalar: {}, dolaplar: { c1: { ad: "Model A", fiyatM2: 800000 } } }; // 8.000 TL/m²
  it("ön yüz alanı: genişlik x yükseklik x adet", () => {
    expect(dolapM2({ genislik: 80, yukseklik: 60, adet: 1 })).toBe(0.48);
    expect(dolapM2({ genislik: 80, yukseklik: 60, adet: 2 })).toBe(0.96);
  });
  it("elle m² girilirse onu kullanır", () => expect(dolapM2({ genislik: 80, yukseklik: 60, adet: 1, m2Override: 1.2 })).toBe(1.2));
  it("maliyet ve satış", () => {
    const r = calcDolap({ id: "d", cabinetId: "c1", ad: "Lavabo dolabı", renk: "Beyaz", genislik: 80, yukseklik: 60, derinlik: 45, adet: 1, aktif: true }, cat, 25);
    expect(r.m2).toBe(0.48);
    expect(r.maliyet).toBe(384000);
    expect(r.satis).toBe(480000);
    expect(r.eksikFiyat).toBe(false);
  });
  it("fiyatsız model eksik fiyat işaretler", () => {
    const r = calcDolap({ id: "d", cabinetId: "yok", ad: "x", renk: "", genislik: 80, yukseklik: 60, derinlik: 45, adet: 1, aktif: true }, cat, 25);
    expect(r.eksikFiyat).toBe(true);
    expect(r.maliyet).toBe(0);
  });
  it("teklif toplamına eklenir; pasif dolap eklenmez", () => {
    const q = { kdvModu: "nakitKdvHaric", kdvOrani: 20, ayarlar: { karMalzemeYuzde: 25, karIscilikYuzde: 10, fireYuzde: 10, yuvarlamaTL: 0 }, dondurulmus: undefined } as unknown as Pick<Quote, "kdvModu" | "kdvOrani" | "ayarlar" | "dondurulmus">;
    const d = { id: "d", cabinetId: "c1", ad: "Dolap", renk: "Beyaz", genislik: 100, yukseklik: 100, derinlik: 40, adet: 1, aktif: true };
    const acik = calcOption(q, { id: "o", ad: "S", indirim: 0, mekanlar: [mekan({ dolaplar: [d] })] }, cat);
    expect(acik.maliyet).toBe(800000); // 1 m² x 8.000 TL
    expect(acik.net).toBe(1000000);
    const kapali = calcOption(q, { id: "o", ad: "S", indirim: 0, mekanlar: [mekan({ dolaplar: [{ ...d, aktif: false }] })] }, cat);
    expect(kapali.maliyet).toBe(0);
  });
});

describe("prompt üretici", () => {
  const urunler: Record<string, Product> = {
    p1: { id: "p1", tedarikci: "Vitra", kategori: "Seramik", kod: "", ad: "Rustic Seramik", birim: "m2", netAlis: 1, renk: "Antrasit", ebat: "60x60", yuzey: "mat", aktif: true, guncellendi: "" },
  };
  const m = mekan({
    acilimlar: [{ id: "a", tip: "kapi", duvar: "alt", ofset: 20, genislik: 80 }],
    ogeler: [{ id: "o", tur: "klozet", ad: "Klozet", x: 100, y: 2, w: 40, h: 70, rot: 0 }],
    kalemler: [{ id: "k", ad: "Seramik", grup: "Kaplama", metin: "", aktif: true, satirlar: [{ id: "l", kind: "malzeme", label: "Zemin seramiği", productId: "p1", birim: "m2", basis: "zemin", carpan: 1, fire: true, metindeGoster: true }] }],
    dolaplar: [{ id: "d", ad: "Lavabo dolabı", renk: "Ceviz", genislik: 80, yukseklik: 60, derinlik: 45, adet: 1, aktif: true }],
  });
  it("ölçü, yerleşim, malzeme ve dolap içerir", () => {
    const t = masterSartname({ mekan: m, urunler, dolapKatalogu: {}, dil: "en", stil: "" });
    expect(t).toContain("2 m × 3 m");
    expect(t).toContain("200 × 300 cm");
    expect(t).toContain("door (swings inward) on the south wall, 20 cm from the west corner, 80 cm wide");
    expect(t).toContain("toilet (WC): against the north wall (gap 2 cm), starting 100 cm from the west corner");
    expect(t).toContain("Zemin seramiği: Vitra, Rustic Seramik, size 60x60, color Antrasit, mat finish");
    expect(t).toContain("color: Ceviz");
  });
  it("Türkçe sürüm ve 6 açı", () => {
    const a = aciPromptlari({ mekan: m, urunler, dolapKatalogu: {}, dil: "tr", stil: "" });
    expect(a).toHaveLength(6);
    expect(a[0].prompt).toContain("ANA ŞARTNAME");
    expect(a[0].prompt).toContain("renk Antrasit");
  });
});

describe("ek duvar ve çıkıntı", () => {
  // 2 x 3 m oda, 2.6 m yükseklik: zemin 6 m², çevre 10 m, duvar 26 m²
  const oda = { en: 2, boy: 3, yukseklik: 2.6, dusumM2: 0 };
  const perde: PlanOge = { id: "p", tur: "duvar", ad: "Perde duvar", x: 50, y: 0, w: 10, h: 100, rot: 0 }; // üst duvardan 100 cm sarkan, 10 cm kalın
  it("duvara yaslama sadece o ekseni değiştirir", () => {
    const o = duvaraYasla({ x: 80, y: 120, w: 40, h: 70, rot: 0 as const }, "sol", 200, 300);
    expect(o).toMatchObject({ x: 0, y: 120 });
    expect(duvaraYasla({ x: 80, y: 120, w: 40, h: 70, rot: 0 as const }, "alt", 200, 300).y).toBe(230);
  });
  it("serbest yüzey: çevre eksi duvara dayalı kenar", () => {
    const a = ogeEkAlan(perde, 200, 300, 2.6);
    expect(a.serbestCm).toBe(210); // 2*(10+100) - 10
    expect(a.duvarM2).toBeCloseTo(5.46, 5);
    expect(a.zeminM2).toBeCloseTo(0.1, 5);
  });
  it("yansıt kapalıysa metraj değişmez", () => {
    const o = olculer({ ...oda, ogeler: [perde] });
    expect(o.zemin).toBe(6);
    expect(o.duvar).toBe(26);
  });
  it("yansıt açıksa duvar artar, zemin azalır", () => {
    const o = olculer({ ...oda, ogeler: [{ ...perde, m2Ekle: true }] });
    expect(o.duvar).toBe(31.46);
    expect(o.zemin).toBe(5.9);
    expect(o.toplam).toBe(37.36);
  });
  it("öğeye özel yükseklik kullanılır", () => {
    const o = olculer({ ...oda, ogeler: [{ ...perde, m2Ekle: true, yukseklik: 100 }] });
    expect(o.duvar).toBe(28.1); // 26 + 2.1 m x 1.0 m
  });
  it("elle girilen m² değişmez", () => {
    const o = olculer({ ...oda, zeminOverride: 7, duvarOverride: 30, ogeler: [{ ...perde, m2Ekle: true }] });
    expect(o.zemin).toBe(7);
    expect(o.duvar).toBe(30);
  });
  it("kolon: duvara dayalı kenar düşülür", () => {
    const kolon: PlanOge = { id: "k", tur: "cikinti", ad: "Kolon", x: 0, y: 100, w: 30, h: 30, rot: 0, m2Ekle: true };
    const a = ogeEkAlan(kolon, 200, 300, 2.6);
    expect(a.serbestCm).toBe(90); // 2*(30+30) - 30
  });
});

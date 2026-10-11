import { getDb } from "../db/schema";
import { nowIso, todayIso } from "../db/ids";
import { defaultSettings } from "../db/seed";
import type { Product, Mekan, QuoteItem } from "../types";
import { itemFromTemplate, newQuote } from "./quote-ops";

/** Örnek veriler SADECE denemek içindir; fiyatlar uydurmadır. Ayarlar > Örnek veri bölümünden silinir. */
const DEMO_YEVMIYE: Record<string, number> = {
  "usta-1": 180000,
  "usta-2": 280000,
  "usta-3": 280000,
  "usta-4": 320000,
  "usta-5": 220000,
  "usta-6": 260000,
  "usta-7": 150000,
};

function p(id: string, tedarikci: string, kategori: string, ad: string, birim: Product["birim"], liraTL: number, kutuM2?: number): Product {
  return { id: `demo-${id}`, tedarikci, kategori, kod: "", ad, birim, netAlis: Math.round(liraTL * 100), kutuM2, notlar: "ÖRNEK VERİ", aktif: true, guncellendi: nowIso() };
}

const DEMO_PRODUCTS: Product[] = [
  p("vitra-seramik", "Vitra", "Seramik", "Vitra Rustic 60x60 Zemin/Duvar Seramiği", "m2", 480, 1.44),
  p("eko-seramik", "Ekonomik", "Seramik", "Ekonomik Seramik 30x60", "m2", 210, 1.62),
  p("yapistirici", "Genel", "Yapı malzemesi", "Yapıştırıcı + derz dolgusu (m² karşılığı)", "m2", 85),
  p("yalitim", "Genel", "Yapı malzemesi", "Su yalıtımı (m² karşılığı)", "m2", 120),
  p("boya", "Genel", "Boya", "Permolit boya + astar (m² karşılığı)", "m2", 35),
  p("gomme-klozet", "Vitra", "Vitrifiye", "Gömme rezervuarlı klozet seti (tam set)", "takim", 9500),
  p("normal-klozet", "Ekonomik", "Vitrifiye", "Normal klozet takımı", "takim", 3200),
  p("lavabo-dolabi", "Genel", "Mobilya", "Evye altı dolabı", "adet", 4800),
  p("havlu-dolabi", "Genel", "Mobilya", "Havlu dolabı", "adet", 2200),
  p("dusakabin", "Genel", "Vitrifiye", "Duşakabin (cam)", "adet", 6500),
  p("ankastre-set", "Genel", "Armatür", "Ankastre duş seti", "takim", 3800),
  p("ankastre-batarya", "Genel", "Armatür", "Ankastre batarya", "adet", 2600),
  p("kompakt-batarya", "Genel", "Armatür", "Kompakt batarya", "adet", 1400),
  p("kompakt-set", "Genel", "Armatür", "Kompakt duş seti", "takim", 1600),
  p("eko-armatur", "Ekonomik", "Armatür", "Ekonomik lavabo bataryası ve armatür seti", "takim", 1800),
  p("gizli-kapi", "Genel", "Kapı", "Gömme sürgülü kapı + kasa", "adet", 8500),
];

/** Şablon satırlarını ürünlere bağlar (ad eşleşmesi). */
const BAGLA: Record<string, string> = {
  "Zemin/duvar seramiği": "vitra-seramik",
  "Yapıştırıcı ve derz dolgusu": "yapistirici",
  "Su yalıtımı (zemin)": "yalitim",
  "Permolit boya ve astar": "boya",
  "Gömme rezervuarlı klozet seti": "gomme-klozet",
  "Klozet seti": "normal-klozet",
  "Lavabo dolabı": "lavabo-dolabi",
  "Havlu dolabı": "havlu-dolabi",
  "Duşakabin": "dusakabin",
  "Ankastre duş seti": "ankastre-set",
  "Ankastre batarya": "ankastre-batarya",
  "Kompakt batarya": "kompakt-batarya",
  "Kompakt duş seti": "kompakt-set",
  "Lavabo bataryası ve armatürler": "eko-armatur",
  "Gömme sürgülü kapı ve kasası": "gizli-kapi",
};

export async function loadDemo(): Promise<void> {
  const db = getDb();
  const labor = await db.labor.toArray();
  for (const l of labor) if (l.yevmiye === 0 && DEMO_YEVMIYE[l.id]) await db.labor.update(l.id, { yevmiye: DEMO_YEVMIYE[l.id] });
  await db.products.bulkPut(DEMO_PRODUCTS);

  const settings = (await db.settings.get("main")) ?? defaultSettings();
  const templates = await db.templates.toArray();
  const bul = (ad: string) => templates.find((t) => t.ad === ad);

  const kalem = (ad: string, seramikUrun?: string): QuoteItem | null => {
    const t = bul(ad);
    if (!t) return null;
    const it = itemFromTemplate(t);
    it.aktif = true;
    it.satirlar = it.satirlar.map((l) => {
      const pid = BAGLA[l.label];
      if (l.kind === "malzeme" && l.label === "Zemin/duvar seramiği" && seramikUrun) return { ...l, productId: `demo-${seramikUrun}` };
      return pid && l.kind === "malzeme" ? { ...l, productId: `demo-${pid}` } : l;
    });
    return it;
  };
  const liste = (adlar: Array<[string, string?]>) => adlar.map(([a, s]) => kalem(a, s)).filter((x): x is QuoteItem => !!x);

  const ust: Mekan = {
    id: "demo-m1", ad: "Üst Kat Banyo (Büyük)", tur: "banyo", en: 3, boy: 3, yukseklik: 2.6, dusumM2: 3,
    zeminOverride: 18, duvarOverride: 24,
    kalemler: liste([
      ["Söküm ve moloz atımı"], ["Banyo / WC genişletme"], ["Gömme sürgülü (gizli) kapı"], ["Elektrik hattı"],
      ["Zemin ve duvar seramiği", "vitra-seramik"], ["Gömme rezervuarlı tuvalet (tam set)"], ["Evye altı (lavabo) dolabı"],
      ["Havlu dolabı"], ["Duşakabin"], ["Kompakt batarya ve duş seti"], ["Tavan permolit boya"],
    ]),
  };
  const alt: Mekan = {
    id: "demo-m2", ad: "Alt Kat WC", tur: "wc", en: 1.5, boy: 2, yukseklik: 2.6, dusumM2: 1.8,
    zeminOverride: 4, duvarOverride: 6,
    kalemler: liste([
      ["Söküm ve moloz atımı"], ["Banyo / WC genişletme"], ["Elektrik hattı"], ["Zemin ve duvar seramiği", "eko-seramik"],
      ["Normal tuvalet"], ["Evye altı (lavabo) dolabı"], ["Ekonomik sınıf batarya ve armatürler"], ["Tavan permolit boya"],
    ]),
  };
  // Alt kattaki ekonomik seramik ürünü
  alt.kalemler.forEach((k) => k.satirlar.forEach((l) => { if (l.label === "Zemin/duvar seramiği") l.productId = "demo-eko-seramik"; }));

  await db.customers.put({ id: "demo-c1", ad: "Şevkat Hanım (ÖRNEK)", telefon: "", eposta: "", adres: "İzmir", notlar: "ÖRNEK VERİ — silinebilir", olusturuldu: nowIso() });
  await db.projects.put({ id: "demo-p1", customerId: "demo-c1", ad: "2 Adet Banyonun Komple Yenilenmesi", adres: "İzmir", durum: "teklif", notlar: "ÖRNEK VERİ", olusturuldu: nowIso() });
  const q = newQuote({ project: (await db.projects.get("demo-p1"))!, tur: "kesin", yil: new Date().getFullYear(), sira: 900, settings });
  q.id = "demo-q1";
  q.rootId = "demo-q1";
  q.no = `EV-${q.yil}-DEMO`;
  q.iseBaslama = todayIso();
  q.teslimIsGunu = 15;
  q.secenekler = [{ id: "demo-o1", ad: "Standart", indirim: 0, mekanlar: [ust, alt] }];
  await db.quotes.put(q);
  await db.settings.put({ ...settings, demoYuklu: true });
}

export async function removeDemo(): Promise<void> {
  const db = getDb();
  const demoId = (x: { id: string }) => x.id.startsWith("demo-");
  await db.products.filter(demoId).delete();
  await db.customers.filter(demoId).delete();
  const pids = (await db.projects.filter(demoId).toArray()).map((x) => x.id);
  for (const pid of pids) {
    await db.quotes.where("projectId").equals(pid).delete();
    await db.payments.where("projectId").equals(pid).delete();
    await db.extraJobs.where("projectId").equals(pid).delete();
    await db.deliveries.where("projectId").equals(pid).delete();
    await db.handovers.where("projectId").equals(pid).delete();
    await db.expenses.where("projectId").equals(pid).delete();
    await db.events.where("projectId").equals(pid).delete();
    await db.files.where("projectId").equals(pid).delete();
  }
  await db.projects.filter(demoId).delete();
  const labor = await db.labor.toArray();
  for (const l of labor) if (DEMO_YEVMIYE[l.id] === l.yevmiye) await db.labor.update(l.id, { yevmiye: 0 });
  const settings = await db.settings.get("main");
  if (settings) await db.settings.put({ ...settings, demoYuklu: false });
}

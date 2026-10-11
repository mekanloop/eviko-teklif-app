import type { Birim, LaborType, LineDef, MekanTuru, Settings, WorkTemplate } from "../types";
import { uid } from "./ids";

export function defaultSettings(): Settings {
  return {
    id: "main",
    firmaAd: "EVİKO DEKORASYON",
    firmaAlt: "Banyo · Mutfak · Komple Tadilat",
    vergiDairesi: "",
    vergiNo: "",
    adres: "İzmir, Türkiye",
    telefon: "",
    eposta: "",
    web: "evikodekorasyon.com",
    iban: "",
    karMalzemeYuzde: 25,
    karIscilikYuzde: 10,
    fireYuzde: 10,
    yuvarlamaTL: 1000,
    kdvOrani: 20,
    gecerlilikGun: 15,
    mekanKapanisMetni: "İşçilik, malzeme nakliyesi ve montaj bu fiyata dahildir.",
    varsayilanNotlarOn: [
      "Bu bir ön fiyat teklifidir. Kesin fiyat, malzeme seçimleri netleştikten ve gerekli görülmesi halinde yerinde inceleme yapıldıktan sonra teyit edilecektir.",
      "İstenilen ek malzeme, özel imalat, farklı marka/model tercihleri veya sonradan eklenecek ek işler toplam fiyatı değiştirebilir.",
      "Moloz atımı ve döküm bedeli fiyata dahildir.",
      "Bu teklif düzenlendiği tarihten itibaren {gecerlilik} gün geçerlidir.",
    ],
    varsayilanNotlarKesin: [
      "Bu fiyat, netleşen malzeme ve iş kalemleri esas alınarak verilmiş kesin fiyat teklifidir.",
      "İşe başlangıç tarihi {iseBaslama} olarak karşılıklı mutabık kalınmıştır.",
      "Malzemeler EVİKO Dekorasyon tarafından temin edilip adrese teslim edilecektir; malzeme temini için ödemenin bir kısmı nakit olarak alınacaktır (bkz. Ödeme Planı sayfası).",
      "Moloz atımı ve döküm bedeli fiyata dahildir.",
      "Bu teklif düzenlendiği tarihten itibaren {gecerlilik} gün geçerlidir.",
    ],
    varsayilanSartlar: [
      "İşe başlangıç tarihi: {iseBaslama}.",
      "Teslim süresi: İşe başlangıçtan itibaren {teslim} iş günüdür.",
      "Malzemeler EVİKO Dekorasyon tarafından tedarik edilip adrese teslim edilecektir.",
      "Sonradan talep edilecek ek iş, ek malzeme veya farklı marka/model tercihleri toplam fiyatı etkileyebilir; bu tür değişiklikler ayrıca yazılı olarak belirtilecektir.",
    ],
    varsayilanPlan: [
      { id: "p1", ad: "Kapora / malzeme avansı (işe başlamadan önce)", yuzde: 40 },
      { id: "p2", ad: "İş ilerleme ödemesi", yuzde: 40 },
      { id: "p3", ad: "Teslimde kalan bakiye", yuzde: 20 },
    ],
    demoYuklu: false,
  };
}

/** Usta türleri. Yevmiyeler boş (0) gelir; Fiyat Listesi > Ustalar ekranından girilir. */
export const USTA_TURLERI = [
  "Söküm / yıkım ustası",
  "Tesisatçı",
  "Elektrikçi",
  "Seramik ustası",
  "Boyacı",
  "Marangoz / montaj ustası",
  "Yardımcı işçi",
];

export function defaultLabor(): LaborType[] {
  return USTA_TURLERI.map((ad, i) => ({ id: `usta-${i + 1}`, ad, yevmiye: 0, aktif: true }));
}

const USTA = {
  sokum: "usta-1",
  tesisat: "usta-2",
  elektrik: "usta-3",
  seramik: "usta-4",
  boya: "usta-5",
  montaj: "usta-6",
  yardimci: "usta-7",
};

function mal(label: string, birim: Birim, basis: LineDef["basis"], carpan: number, fire = false): LineDef {
  return { id: uid(), kind: "malzeme", label, birim, basis, carpan, fire };
}
function isc(label: string, laborTypeId: string, gun = 1, kisi = 1): LineDef {
  return { id: uid(), kind: "iscilik", label, laborTypeId, gun, kisi, birim: "gun", basis: "sabit", carpan: 1, fire: false };
}

interface Seed {
  ad: string;
  grup: string;
  mekan: MekanTuru[];
  metin: string;
  acik: boolean;
  satirlar: () => LineDef[];
}

const WET: MekanTuru[] = ["banyo", "wc"];

const SEEDS: Seed[] = [
  {
    ad: "Söküm ve moloz atımı",
    grup: "Söküm",
    mekan: ["banyo", "wc", "mutfak"],
    acik: true,
    metin:
      "Mevcut seramik, batarya, dolap ve duşakabinin sökümü; oluşan molozun bina dışına taşınması ve döküm bedeli dahildir.",
    satirlar: () => [isc("Söküm işçiliği", USTA.sokum, 1, 1), isc("Moloz taşıma (yardımcı)", USTA.yardimci, 1, 1), mal("Moloz torbası, nakliye ve döküm", "goturu", "sabit", 1)],
  },
  {
    ad: "Temiz/pis su tesisatı",
    grup: "Tesisat",
    mekan: ["banyo", "wc", "mutfak"],
    acik: true,
    metin: "Temiz su ve pis su tesisatının komple elden geçirilmesi / gerekli yerlerin yenilenmesi.",
    satirlar: () => [isc("Tesisat işçiliği", USTA.tesisat, 2, 1), mal("Tesisat malzemesi (boru, fittings)", "goturu", "sabit", 1)],
  },
  {
    ad: "Elektrik hattı",
    grup: "Elektrik",
    mekan: ["banyo", "wc", "mutfak", "salon", "oda"],
    acik: true,
    metin: "Elektrik hattının yenilenmesi (aydınlatma ve priz devresi dahil).",
    satirlar: () => [isc("Elektrik işçiliği", USTA.elektrik, 1, 1), mal("Kablo, priz, anahtar, spot", "goturu", "sabit", 1)],
  },
  {
    ad: "Zemin ve duvar seramiği",
    grup: "Kaplama",
    mekan: ["banyo", "wc", "mutfak"],
    acik: true,
    metin:
      "Zemin ve duvar (toplam yaklaşık {toplam} m²) {marka} seramik ile yenilenmesi (model müşteri ile birlikte seçilecektir).",
    satirlar: () => [
      { ...mal("Zemin/duvar seramiği", "m2", "toplam", 1, true), metindeGoster: true },
      mal("Yapıştırıcı ve derz dolgusu", "m2", "toplam", 1),
      mal("Su yalıtımı (zemin)", "m2", "zemin", 1),
      isc("Seramik işçiliği", USTA.seramik, 4, 1),
      isc("Seramik yardımcı işçilik", USTA.yardimci, 4, 1),
    ],
  },
  {
    ad: "Gömme rezervuarlı tuvalet (tam set)",
    grup: "Vitrifiye",
    mekan: WET,
    acik: false,
    metin: "Gömme rezervuarlı tuvalet (tam set) temini ve montajı.",
    satirlar: () => [mal("Gömme rezervuarlı klozet seti", "takim", "sabit", 1), isc("Montaj işçiliği", USTA.tesisat, 0.5, 1)],
  },
  {
    ad: "Normal tuvalet",
    grup: "Vitrifiye",
    mekan: WET,
    acik: false,
    metin: "Normal (gömme rezervuarsız) tuvalet temini ve montajı.",
    satirlar: () => [mal("Klozet seti", "takim", "sabit", 1), isc("Montaj işçiliği", USTA.tesisat, 0.5, 1)],
  },
  {
    ad: "Evye altı (lavabo) dolabı",
    grup: "Mobilya",
    mekan: WET,
    acik: false,
    metin: "Evye altı (lavabo) dolabı — 1 adet, temin ve montaj dahil.",
    satirlar: () => [mal("Lavabo dolabı", "adet", "sabit", 1), isc("Montaj işçiliği", USTA.montaj, 0.5, 1)],
  },
  {
    ad: "Havlu dolabı",
    grup: "Mobilya",
    mekan: WET,
    acik: false,
    metin: "Havlu dolabı — 1 adet, temin ve montaj dahil.",
    satirlar: () => [mal("Havlu dolabı", "adet", "sabit", 1), isc("Montaj işçiliği", USTA.montaj, 0.5, 1)],
  },
  {
    ad: "Duşakabin",
    grup: "Vitrifiye",
    mekan: ["banyo"],
    acik: false,
    metin: "Duşakabinin yeniden yapılması (yeni duşakabin temini ve montajı).",
    satirlar: () => [mal("Duşakabin", "adet", "sabit", 1), isc("Montaj işçiliği", USTA.montaj, 1, 1)],
  },
  {
    ad: "Ankastre duş seti ve batarya",
    grup: "Armatür",
    mekan: ["banyo"],
    acik: false,
    metin: "Ankastre duş seti ve ankastre batarya temini ve montajı.",
    satirlar: () => [mal("Ankastre duş seti", "takim", "sabit", 1), mal("Ankastre batarya", "adet", "sabit", 1), isc("Montaj işçiliği", USTA.tesisat, 1, 1)],
  },
  {
    ad: "Kompakt batarya ve duş seti",
    grup: "Armatür",
    mekan: ["banyo"],
    acik: false,
    metin: "Kompakt batarya ve kompakt duş seti temini ve montajı.",
    satirlar: () => [mal("Kompakt batarya", "adet", "sabit", 1), mal("Kompakt duş seti", "takim", "sabit", 1), isc("Montaj işçiliği", USTA.tesisat, 0.5, 1)],
  },
  {
    ad: "Ekonomik sınıf batarya ve armatürler",
    grup: "Armatür",
    mekan: WET,
    acik: false,
    metin: "Diğer batarya ve armatürler ekonomik sınıf, marka/model EVİKO Dekorasyon tarafından belirlenecektir.",
    satirlar: () => [mal("Lavabo bataryası ve armatürler", "takim", "sabit", 1), isc("Montaj işçiliği", USTA.tesisat, 0.5, 1)],
  },
  {
    ad: "Banyo / WC genişletme",
    grup: "İnşaat",
    mekan: WET,
    acik: false,
    metin:
      "Banyo genişletme işlemi (yaklaşık {toplam} m² zemin ve duvar alanı) ve bu kapsamda tesisat işlerinin komple elden geçirilmesi.",
    satirlar: () => [isc("Duvar yıkımı / örme işçiliği", USTA.sokum, 2, 1), isc("Tesisat taşıma işçiliği", USTA.tesisat, 1, 1), mal("Tuğla, harç, sıva ve tesisat malzemesi", "goturu", "sabit", 1)],
  },
  {
    ad: "Gömme sürgülü (gizli) kapı",
    grup: "İnşaat",
    mekan: ["banyo", "wc", "oda"],
    acik: false,
    metin: "Gömme sürgülü (gizli) kapı için yerin açılması ve kapının temini ve montajı.",
    satirlar: () => [mal("Gömme sürgülü kapı ve kasası", "adet", "sabit", 1), isc("Yer açma ve montaj işçiliği", USTA.montaj, 1.5, 1)],
  },
  {
    ad: "Tavan permolit boya",
    grup: "Boya",
    mekan: ["banyo", "wc", "mutfak", "salon", "oda"],
    acik: true,
    metin: "Tavanın permolit boya ile yenilenmesi.",
    satirlar: () => [mal("Permolit boya ve astar", "m2", "tavan", 1), isc("Boya işçiliği", USTA.boya, 1, 1)],
  },
];

export function defaultTemplates(): WorkTemplate[] {
  return SEEDS.map((s, i) => ({
    id: `sablon-${i + 1}`,
    ad: s.ad,
    grup: s.grup,
    mekanTurleri: s.mekan,
    metin: s.metin,
    varsayilanAcik: s.acik,
    satirlar: s.satirlar(),
    sira: i + 1,
  }));
}

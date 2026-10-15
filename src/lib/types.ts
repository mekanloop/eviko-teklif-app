/**
 * Alan modeli. Tüm para değerleri KURUŞ cinsinden tam sayıdır (KDV hariç).
 * Tarihler ISO metin ("2026-10-06" veya tam ISO zaman damgası) olarak saklanır.
 */
export type Id = string;
export type Kurus = number;

export type Birim = "m2" | "adet" | "mt" | "kg" | "paket" | "takim" | "kutu" | "gun" | "goturu";

export const BIRIM_ETIKET: Record<Birim, string> = {
  m2: "m²",
  adet: "adet",
  mt: "mt",
  kg: "kg",
  paket: "paket",
  takim: "takım",
  kutu: "kutu",
  gun: "gün",
  goturu: "götürü",
};

/* ------------------------------ Fiyat listesi ------------------------------ */

export interface Product {
  id: Id;
  tedarikci: string;
  kategori: string;
  kod: string;
  ad: string;
  birim: Birim;
  /** Birim başına net alış fiyatı, KDV hariç */
  netAlis: Kurus;
  /** Kutu başına m² (seramik gibi kutu ile satılan ürünler). Doluysa miktar tam kutuya yuvarlanır. */
  kutuM2?: number;
  /** Görsel/prompt için: renk, ebat, yüzey (mat/parlak vb.) */
  renk?: string;
  ebat?: string;
  yuzey?: string;
  notlar?: string;
  aktif: boolean;
  guncellendi: string;
}

/** Dolap kataloğu: model + m² fiyatı + renk seçenekleri */
export interface Cabinet {
  id: Id;
  ad: string;
  tedarikci: string;
  kategori: string;
  /** m² başına net fiyat (KDV hariç) */
  fiyatM2: Kurus;
  renkler: string[];
  /** Model görseli (data URL) */
  gorsel?: string;
  notlar?: string;
  aktif: boolean;
  guncellendi: string;
}

export interface LaborType {
  id: Id;
  ad: string;
  /** Günlük yevmiye (usta türüne göre) */
  yevmiye: Kurus;
  aktif: boolean;
}

/** Günlük/sabit gider tanımı (yemek, benzin…). Teklif maliyetine ve kâr hesabına girer. */
export type GiderBirimi = "kisiGun" | "gun" | "sabit";
export const GIDER_BIRIM_ETIKET: Record<GiderBirimi, string> = {
  kisiGun: "kişi başı / gün",
  gun: "iş günü başına",
  sabit: "iş başına sabit",
};
export interface GiderTanimi {
  id: Id;
  ad: string;
  birim: GiderBirimi;
  tutar: Kurus;
  /** Teklif fiyatına da yansıtılsın (işçilik kâr oranıyla). Kapalıysa sadece maliyete girer. */
  yansit: boolean;
  aktif: boolean;
}

/* --------------------------- İş kalemi şablonları -------------------------- */

export type Basis = "sabit" | "zemin" | "duvar" | "toplam" | "tavan" | "cevre";

export const BASIS_ETIKET: Record<Basis, string> = {
  sabit: "Sabit miktar",
  zemin: "Zemin m²",
  duvar: "Duvar m²",
  toplam: "Zemin + duvar m²",
  tavan: "Tavan m²",
  cevre: "Çevre (mt)",
};

export interface LineDef {
  id: Id;
  kind: "malzeme" | "iscilik";
  label: string;
  /* malzeme */
  productId?: Id;
  /** Üründen bağımsız elle girilen birim maliyet (productId yoksa kullanılır) */
  manuelBirimMaliyet?: Kurus;
  birim: Birim;
  basis: Basis;
  /** basis=sabit ise miktarın kendisi, değilse m²/mt başına çarpan */
  carpan: number;
  /** Fire uygulansın mı */
  fire: boolean;
  /** Bu satıra özel fire yüzdesi (boşsa tekliften gelir) */
  fireYuzde?: number;
  /** Müşteri cümlesindeki {urun} / {marka} bu satırın ürününü kullansın */
  metindeGoster?: boolean;
  /* işçilik */
  laborTypeId?: Id;
  gun?: number;
  kisi?: number;
}

export type MekanTuru = "banyo" | "wc" | "mutfak" | "salon" | "oda" | "genel";

export const MEKAN_ETIKET: Record<MekanTuru, string> = {
  banyo: "Banyo",
  wc: "WC",
  mutfak: "Mutfak",
  salon: "Salon",
  oda: "Oda",
  genel: "Genel",
};

export interface WorkTemplate {
  id: Id;
  ad: string;
  grup: string;
  mekanTurleri: MekanTuru[];
  /** Müşteriye görünen cümle. Yer tutucular: {zemin} {duvar} {toplam} {tavan} {urun} {marka} */
  metin: string;
  varsayilanAcik: boolean;
  satirlar: LineDef[];
  sira: number;
}

/* --------------------------------- Teklif ---------------------------------- */

export interface QuoteItem {
  id: Id;
  templateId?: Id;
  ad: string;
  grup: string;
  metin: string;
  aktif: boolean;
  satirlar: LineDef[];
}

export type PlanOgeTuru = "klozet" | "lavabo" | "dusakabin" | "kuvet" | "camasir" | "havlu" | "dolap" | "duvar" | "cikinti" | "diger";
export const PLAN_OGE_ETIKET: Record<PlanOgeTuru, string> = {
  klozet: "Klozet",
  lavabo: "Lavabo",
  dusakabin: "Duşakabin",
  kuvet: "Küvet",
  camasir: "Çamaşır makinesi",
  havlu: "Havluluk",
  dolap: "Dolap",
  duvar: "Ek duvar / perde duvar",
  cikinti: "Çıkıntı / kolon",
  diger: "Diğer",
};

/** Krokideki yerleşim öğesi. Birim: cm, orijin: odanın sol-üst köşesi. */
export interface PlanOge {
  id: Id;
  tur: PlanOgeTuru;
  ad: string;
  x: number;
  y: number;
  /** Yatayda (x yönünde) boyut, döndürmeden önce */
  w: number;
  /** Dikeyde (y yönünde) boyut */
  h: number;
  rot: 0 | 90 | 180 | 270;
  /** tur=dolap ise Mekan.dolaplar içindeki kayıt */
  dolapId?: Id;
  /** Ek duvar/çıkıntı yüksekliği (cm); boşsa mekan yüksekliği */
  yukseklik?: number;
  /** Ek duvar/çıkıntı yüzeyleri duvar m²'sine, tabanı zemin m²'sinden düşülerek yansıtılsın */
  m2Ekle?: boolean;
}

export type DuvarYonu = "ust" | "sag" | "alt" | "sol";
export const DUVAR_ETIKET: Record<DuvarYonu, string> = { ust: "Üst duvar", sag: "Sağ duvar", alt: "Alt duvar", sol: "Sol duvar" };

export interface PlanAcilim {
  id: Id;
  tip: "kapi" | "pencere" | "surgulu";
  duvar: DuvarYonu;
  /** Duvarın başından (üst/alt duvarda soldan, sağ/sol duvarda yukarıdan) cm */
  ofset: number;
  genislik: number;
}

/** Teklife dahil dolap: katalogdaki modelden, ölçüsü ve rengiyle. */
export interface MekanDolap {
  id: Id;
  cabinetId?: Id;
  ad: string;
  renk: string;
  /** cm */
  genislik: number;
  yukseklik: number;
  derinlik: number;
  adet: number;
  /** Elle girilen toplam m² (boşsa genişlik × yükseklik ön yüz alanı hesaplanır) */
  m2Override?: number;
  aktif: boolean;
  not?: string;
}

export interface Mekan {
  id: Id;
  ad: string;
  tur: MekanTuru;
  en: number;
  boy: number;
  yukseklik: number;
  /** Kapı/pencere düşümü (m²) */
  dusumM2: number;
  /** Elle girilmişse hesaplanan yerine bu kullanılır */
  zeminOverride?: number;
  duvarOverride?: number;
  kalemler: QuoteItem[];
  dolaplar?: MekanDolap[];
  acilimlar?: PlanAcilim[];
  ogeler?: PlanOge[];
}

export interface QuoteOption {
  id: Id;
  ad: string;
  mekanlar: Mekan[];
  /** Pazarlık / indirim (kuruş), satış toplamından düşülür */
  indirim: Kurus;
}

export type QuoteTuru = "on" | "kesin";
export type QuoteDurum = "taslak" | "gonderildi" | "onaylandi" | "reddedildi" | "yerineGecti";
export type KdvModu = "nakitKdvHaric" | "kdvli";

export const TUR_ETIKET: Record<QuoteTuru, string> = {
  on: "Ön Fiyat Teklifi",
  kesin: "Kesin Fiyat Teklifi",
};

export const DURUM_ETIKET: Record<QuoteDurum, string> = {
  taslak: "Taslak",
  gonderildi: "Gönderildi",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  yerineGecti: "Revize ile değişti",
};

export interface QuoteSettings {
  karMalzemeYuzde: number;
  karIscilikYuzde: number;
  fireYuzde: number;
  /** Genel toplamı bu TL tutarının katına yuvarla (0 = yuvarlama yok) */
  yuvarlamaTL: number;
}

export interface Frozen {
  tarih: string;
  urunler: Record<Id, { netAlis: Kurus; kutuM2?: number; ad: string; tedarikci?: string }>;
  ustalar: Record<Id, { yevmiye: Kurus; ad: string }>;
  dolaplar?: Record<Id, { fiyatM2: Kurus; ad: string }>;
  giderler?: Record<Id, { ad: string; birim: GiderBirimi; tutar: Kurus; yansit: boolean }>;
}

export interface PlanKalemi {
  id: Id;
  ad: string;
  /** Toplam sözleşme bedelinin yüzdesi */
  yuzde: number;
}

export interface Quote {
  id: Id;
  customerId: Id;
  projectId: Id;
  yil: number;
  sira: number;
  /** EV-2026-014 */
  no: string;
  /** İlk teklifin id'si; revizeler aynı rootId'yi taşır */
  rootId: Id;
  revNo: number;
  /** Kesin teklife dönüştükten sonraki revize sayısı (ilk kesin teklif = 0) */
  kesinRevNo: number;
  tur: QuoteTuru;
  durum: QuoteDurum;
  tarih: string;
  gecerlilikGun: number;
  iseBaslama?: string;
  teslimIsGunu?: number;
  konu: string;
  kdvModu: KdvModu;
  kdvOrani: number;
  mekanToplamGoster: boolean;
  /** Teklif çıktısına mekan krokileri eklensin */
  krokiGoster?: boolean;
  /** Bu teklifte kapatılan gider tanımları */
  giderKapali?: Id[];
  ayarlar: QuoteSettings;
  secenekler: QuoteOption[];
  secilenSecenekId?: Id;
  notlar: string[];
  sartlar: string[];
  odemePlani: PlanKalemi[];
  dondurulmus?: Frozen;
  olusturuldu: string;
  guncellendi: string;
}

/* --------------------------- Müşteri / proje akışı -------------------------- */

export interface Customer {
  id: Id;
  ad: string;
  telefon: string;
  eposta: string;
  adres: string;
  notlar: string;
  olusturuldu: string;
}

export type ProjeDurum = "kesif" | "teklif" | "onayli" | "uygulama" | "teslim" | "kapali" | "iptal";

export const PROJE_DURUM_ETIKET: Record<ProjeDurum, string> = {
  kesif: "Keşif",
  teklif: "Teklif aşaması",
  onayli: "Onaylandı",
  uygulama: "Uygulamada",
  teslim: "Teslim edildi",
  kapali: "Kapandı",
  iptal: "İptal",
};

export interface Project {
  id: Id;
  customerId: Id;
  ad: string;
  adres: string;
  durum: ProjeDurum;
  kesifTarihi?: string;
  baslangic?: string;
  bitis?: string;
  notlar: string;
  /** Onaylanan teklifin id'si */
  onayliQuoteId?: Id;
  olusturuldu: string;
}

export interface Payment {
  id: Id;
  projectId: Id;
  tarih: string;
  aciklama: string;
  tutar: Kurus;
  sekil: "nakit" | "havale" | "kart" | "cek";
  /** Müşteri imzası (PNG data URL) */
  imza?: string;
}

export interface ExtraJob {
  id: Id;
  projectId: Id;
  tarih: string;
  baslik: string;
  aciklama: string;
  /** Müşteriye satış bedeli (KDV hariç) */
  tutar: Kurus;
  /** Tahmini maliyet (kâr takibi için) */
  maliyet: Kurus;
  durum: "bekliyor" | "onaylandi" | "reddedildi";
  imza?: string;
}

export interface DeliveryRow {
  id: Id;
  ad: string;
  miktar: string;
  teslimEdildi: boolean;
  not: string;
}

export interface Delivery {
  id: Id;
  projectId: Id;
  tarih: string;
  teslimAlan: string;
  satirlar: DeliveryRow[];
  not: string;
  imza?: string;
}

export interface HandoverRow {
  id: Id;
  ad: string;
  tamam: boolean;
  not: string;
}

export interface Handover {
  id: Id;
  projectId: Id;
  tarih: string;
  teslimAlan: string;
  satirlar: HandoverRow[];
  eksikler: string;
  not: string;
  imza?: string;
}

export type GiderKategori = "malzeme" | "iscilik" | "nakliye" | "yemek" | "yakit" | "diger";
export const GIDER_KATEGORI_ETIKET: Record<GiderKategori, string> = {
  malzeme: "Malzeme",
  iscilik: "İşçilik / usta",
  nakliye: "Nakliye / moloz",
  yemek: "Yemek",
  yakit: "Benzin / yakıt",
  diger: "Diğer",
};

/** Yapılan ödeme (gider). projectId yoksa genel (işe bağlı olmayan) gider. */
export interface Expense {
  id: Id;
  projectId?: Id;
  tarih: string;
  kategori: GiderKategori;
  aciklama: string;
  /** Ödemenin yapıldığı yer / kişi (tedarikçi, usta…) */
  tedarikci: string;
  tutar: Kurus;
  sekil?: "nakit" | "havale" | "kart" | "cek";
}

export interface CalEvent {
  id: Id;
  projectId?: Id;
  baslik: string;
  tarih: string;
  saat?: string;
  tur: "kesif" | "teslim" | "is" | "hatirlatma";
  tamam: boolean;
  not: string;
}

export interface ProjectFile {
  id: Id;
  projectId: Id;
  ad: string;
  tur: string;
  boyut: number;
  tarih: string;
  blob: Blob;
}

/* --------------------------------- Ayarlar --------------------------------- */

export interface Settings {
  id: "main";
  firmaAd: string;
  firmaAlt: string;
  vergiDairesi: string;
  vergiNo: string;
  adres: string;
  telefon: string;
  eposta: string;
  web: string;
  iban: string;
  logo?: string;
  karMalzemeYuzde: number;
  karIscilikYuzde: number;
  fireYuzde: number;
  yuvarlamaTL: number;
  kdvOrani: number;
  gecerlilikGun: number;
  mekanKapanisMetni: string;
  varsayilanNotlarOn: string[];
  varsayilanNotlarKesin: string[];
  varsayilanSartlar: string[];
  varsayilanPlan: PlanKalemi[];
  demoYuklu: boolean;
  /** Uygulanmış veri güncellemeleri */
  migrations?: string[];
}

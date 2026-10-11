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

export interface Expense {
  id: Id;
  projectId: Id;
  tarih: string;
  kategori: "malzeme" | "iscilik" | "nakliye" | "diger";
  aciklama: string;
  tedarikci: string;
  tutar: Kurus;
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
}

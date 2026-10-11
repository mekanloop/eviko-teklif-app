# Eviko Teklif Uygulaması — Plan (v2)

Tek kullanıcılı (Eviko sahibi), iPad'de çalışan PWA. Eviko kurumsal sitesinden (evikodekorasyon.com) tamamen ayrı repo ve proje.

## 1. Kesinleşen kararlar

| Konu | Karar |
|---|---|
| Veri | Bulut (Supabase: Postgres, Auth, Storage), otomatik yedek |
| İnternet | Hep var kabul edilir, çevrimdışı mod yok |
| Giriş | E-posta + şifre, tek kullanıcı |
| Yayın | Vercel, şimdilik Vercel adresi |
| Fiyat girişi | Excel/CSV içe aktarma (1.000-5.000 kalem) + elle düzenleme |
| Maliyet | Doğrudan net alış fiyatı (KDV hariç) |
| Satış fiyatı | Malzeme +%25, işçilik +%10 (genel ayar, teklifte değiştirilebilir) |
| İşçilik | Usta türüne göre yevmiye × gün. Şablonda varsayılan gün, teklifte değiştirilebilir |
| Ölçü | En, boy, yükseklik, kapı/pencere düşümü → zemin ve duvar m² otomatik |
| Fire | Sabit oran (varsayılan %10), teklifte değiştirilebilir |
| Kutu bazlı ürün | m² + fire → tam kutuya yukarı yuvarla |
| KDV | Teklif başına seçilir: "Nakit, KDV hariç" (varsayılan, KDV hesaplanmaz) veya "KDV'li" (tek oran) |
| Teklif numarası | EV-2026-014, revizeler EV-2026-014-R2 |
| Teklif türleri | Ön Fiyat Teklifi, Kesin Fiyat Teklifi, Revize N |
| Müşteri görünümü | Genel toplam. Mekan bazlı toplam teklif başına açılıp kapanır. Maliyet hiç görünmez |
| Paketler | Bir teklifte 2-3 alternatif (ekonomik / standart / lüks) |
| İş türleri | Banyo, mutfak, komple daire, serbest kalem |
| Akış | Müşteri → Keşif → Ön teklif → Kesin teklif → Revizeler → Onay → Mal teslim → İş → Ek iş → İş teslim → Ödeme |
| Ödeme | Şablon plan (kapora / ilerleme / teslim), projede düzenlenebilir. İmzalı alınan ödemeler tablosu |
| Fiyat geçmişi | Gönderilen teklifin fiyatı dondurulur |
| Mal teslim | Teklifteki malzemelerin müşteriye/şantiyeye teslimi, parmakla imza |
| Paylaşım | Müşteriye özel, tahmin edilemez ve süreli görüntüleme linki |
| Ekler | Fotoğraf/dosya, takvim ve hatırlatma, gerçek harcama ve kâr takibi |

## 2. Gerçek tekliflerden çıkarımlar (Şevkat Hanım, 4 PDF)

- Teklif kalem fiyatı vermez, kapsamı madde madde anlatır (söküm, tesisat, elektrik, seramik m² + marka, vitrifiye, dolap, duşakabin, boya). Sonda tek genel toplam.
- Her iş kalemi şablonunun **müşteriye görünen cümlesi** olur. Kalem seçildikçe maddeler otomatik oluşur, düzenlenebilir. Maliyet hesabı arka planda ayrı yürür.
- Sayfa 2: ödeme planı, alınan ödemeler tablosu (imzalı), genel şartlar, imza blokları. Teklif geçerlilik süresi 15 gün.
- Metraj: "zemin ve duvar toplam yaklaşık 42 m²" biçiminde tek rakam yazılıyor. Motor zemin ve duvarı ayrı tutup toplamı gösterir.
- Revizeler gerçek: kapsam ve fiyat her revizede değişiyor (330.000 → 320.000 → 621.000 → 589.000 ₺). Uygulama revizeleri yan yana karşılaştırır.
- Kimlik: lacivert bantlar, bronz çizgi, "EVİKO DEKORASYON" yazı logosu. Korunup kurumsal hale getirilir.
- Tutarlılık uyarısı: teklif tarihi işe başlama tarihinden sonra ise (Rev 2 örneği) kesinleştirirken uyarı verilir.

## 3. Başlangıç iş kalemi kataloğu (tekliflerden)

1. Söküm + moloz taşıma ve döküm
2. Temiz/pis su tesisatı yenileme
3. Elektrik hattı yenileme (aydınlatma, priz)
4. Zemin ve duvar seramiği (marka, m², fire, kutu)
5. Gömme rezervuarlı tuvalet (tam set)
6. Normal tuvalet
7. Evye altı (lavabo) dolabı
8. Havlu dolabı
9. Duşakabin
10. Ankastre duş seti + ankastre batarya
11. Kompakt batarya + kompakt duş seti
12. Ekonomik sınıf batarya/armatür
13. Banyo/WC genişletme işlemi
14. Gömme sürgülü (gizli) kapı
15. Tavan permolit boya

Maliyet kalemi dökümü olmadığı için (teklif toplamları tecrübeyle bulunmuş) ilk kurulumda her kalemin birim maliyetini ve gün sayısını birlikte gireriz. Rev 2'yi (589.000 ₺, 42 m² + 10 m²) kalibrasyon hedefi olarak kullanırız. Uygulama geçmiş tekliflerin m² başı ortalamasını gösterip büyük sapmayı işaretler.

## 4. Teknoloji

Next.js (App Router) + TypeScript + Tailwind · Supabase · Vercel · PWA (manifest + service worker, sadece uygulama kabuğu) · sunucu tarafı PDF (Türkçe karakter + logo) · canvas imza · parasal değerler kuruş cinsinden tam sayı · hesap motoru ayrı, saf TypeScript modülü, otomatik testli.

Güvenlik: tüm tablolarda Row Level Security, müşteri linki yalnızca tek teklifin genel görünümünü verir (maliyet/kâr alanları o görünüme hiç gönderilmez), servis anahtarı yalnızca sunucu ortam değişkeninde.

## 5. Aşamalar

| Aşama | İçerik |
|---|---|
| 0 | Repo iskeleti, PWA, Supabase bağlantısı, giriş, iPad'de kurulum |
| 1 | Tedarikçi/ürün/fiyat listesi + Excel içe aktarma, iş kalemi şablonları, banyo hesaplayıcı, paketler, kalibrasyon testleri |
| 2 | Müşteri ve proje kaydı, ön/kesin/revize akışı, numaralandırma, marka PDF, müşteri linki, revize karşılaştırma |
| 3 | Onay, ek işler, mal teslim, iş teslim, imza, ödeme planı ve alınan ödemeler, dosyalar, takvim |
| 4 | Gerçek harcama, kâr raporu, dışa aktarma/yedek |
| 5 | Mutfak, komple daire, serbest kalem şablonları |
| 6 | Görselleştirme (yapıldı, yerel): ölçülü kroki (sürükle-bırak yerleşim), dolap kataloğu + m² maliyeti, ChatGPT için master prompt ve açı promptları, çıktıya kroki sayfası |

## 5b. Görselleştirme kararları

- Uygulama içinde 3D/fotogerçekçi render yapılmaz. Müşteriye ölçülü kroki (2D) gösterilir; fotogerçekçi görseller için uygulama ChatGPT'ye verilecek ana şartname ve 6 açı promptu üretir (ölçü, yerleşim, malzeme adı/renk/ebat/yüzey, dolap modeli ve rengi). Kroki PNG olarak indirilip referans görsel diye eklenir.
- Dolap: katalogdan model + renk seçilir, ölçü (cm) girilir; alan × m² fiyatı maliyete eklenir. Varsayılan alan = genişlik × yükseklik × adet (ön yüz); asıl hesap kuralı kullanıcıdan teyit edilecek, her dolapta m² elle de girilebilir.
- Dolap 3D modelleri "yüklenecek, sadece rengi değişecek" olarak istendi; format ve kullanım şekli netleşince eklenir.

## 6. Açık konular

- Dolap m² hesap kuralı (ön yüz mü, toplam yüzey mi, kapak/gövde ayrı mı).
- PDF kataloglar: ürün adı, fiyat, renk, ebat ayıklanıp CSV'ye çevrilecek ve içe aktarılacak.

- Firma bilgileri: unvan, vergi dairesi/no, adres, telefon, IBAN, logo dosyası.
- Usta türleri ve yevmiye değerleri.
- Gerçek tedarikçi fiyat listesi örneği (Excel/CSV).
- KDV oranı (muhasebeciyle teyit).
- Sözleşme, mal teslim ve iş teslim metinleri (taslağı hazırlanacak, hukuki kontrol senden).
- Supabase projesi ve Vercel bağlantısı (Aşama 0 için).

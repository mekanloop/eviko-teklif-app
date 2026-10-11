# Eviko Teklif

Eviko Dekorasyon için tek kullanıcılı teklif ve iş takip uygulaması (iPad PWA).

- Teklif hesaplama: ölçülerden m² → şablon bazlı maliyet → malzeme/işçilik kârı → yuvarlama → müşteri toplamı
- İş akışı: müşteri → proje → ön/kesin teklif → revizeler → onay → ödeme planı → mal teslim → ek işler → iş teslim → harcama ve kâr
- Çıktılar: A4 teklif PDF'i (Yazdır → PDF), mal teslim formu, iş teslim tutanağı, ek iş formu (parmakla imza)

**Durum:** Yerel sürüm. Veriler tarayıcının IndexedDB'sinde durur (Dexie). Bulut (Supabase) bağlantısı henüz yok.
Plan için `docs/PLAN.md`.

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:3100
npm test           # hesap motoru testleri
npm run build && npm start
```

iPad'de "Ana Ekrana Ekle" ile kurulum için HTTPS gerekir (Vercel'e yayınlanınca).
Yerelde ağdan denemek için `npm run dev` çıktısındaki LAN adresi kullanılabilir (PWA kurulumu olmadan).

## Yapı

```
src/lib/types.ts          alan modeli (para = kuruş, tam sayı)
src/lib/engine/           saf hesap motoru + testler (calc, money, text, finance)
src/lib/db/               yerel veritabanı (Dexie), ilk kurulum verileri
src/lib/data/             TÜM veri erişimi burada: actions, hooks, backup, demo
src/components, src/app   arayüz
```

## Supabase'e geçiş (sonraki adım)

Arayüz veriye yalnızca `src/lib/data/*` üzerinden dokunur (`actions.ts` yazma, `hooks.ts` okuma).
Geçiş için bu iki dosyanın Supabase karşılığı yazılır, `db/schema.ts` yerel önbellek ya da kaldırılır.
Müşteri görüntüleme linki ve e-posta/şifre girişi de bu aşamada eklenir.
Mevcut verileri taşımak için Ayarlar → "Yedek indir (JSON)" kullanılır.

## Notlar

- Fiyatlar ve yevmiyeler başlangıçta boştur (0); Fiyat Listesi ekranından girilir. Ayarlar'daki "Örnek veri" yalnızca denemek içindir, uydurma fiyat içerir.
- KDV oranı varsayılanı (%20) yer tutucudur; muhasebeciyle teyit edilmelidir.

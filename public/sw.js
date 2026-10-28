/* Eviko Teklif — hafif servis çalışanı: yalnızca uygulama kabuğu (statik dosyalar) önbelleğe alınır.
   Müşteri/proje verisi IndexedDB'de durur; bu dosya ona ASLA dokunmaz.
   v2: başarısız (404/500/HTML) yanıtlar artık önbelleğe alınmaz; eski önbellekler silinir.
   v3: sayfa ağdan alınamazsa başka bir sayfa (Panel) gösterilmez; açık bir bağlantı hatası sayfası çıkar. */

function baglantiHatasi(yol) {
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bağlantı kurulamadı</title><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;background:#f1f4f9;color:#1b2a4a;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}.k{max-width:460px;margin:24px;background:#fff;border-radius:20px;padding:28px;box-shadow:0 6px 30px rgba(19,31,56,.12)}h1{font-size:20px;margin:0 0 8px}p{line-height:1.5;color:#44608f}a,button{display:inline-block;margin:6px 6px 0 0;padding:12px 18px;border-radius:12px;border:0;font-size:16px;font-weight:600;text-decoration:none;cursor:pointer}.p{background:#1b2a4a;color:#fff}.g{background:#e1e7f1;color:#1b2a4a}</style></head><body><div class="k"><h1>Sayfa sunucudan alınamadı</h1><p><b>${yol}</b> adresi şu an açılamıyor. Bu, internet bağlantısı veya ağınızın bu siteye erişimiyle ilgili bir durumdur; <b>verileriniz cihazınızda güvende</b>, silinmedi.</p><p>Başka bir ağı (telefon verisi) veya DNS 1.1.1.1 deneyin, sonra tekrar deneyin.</p><button class="p" onclick="location.reload()">Tekrar dene</button><a class="g" href="/">Panele git</a></div></body></html>`;
  return new Response(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}
const CACHE = "eviko-shell-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Sadece başarılı ve beklenen türde yanıtlar önbelleğe girer. */
function saklanabilir(req, res) {
  if (!res || res.status !== 200 || res.type === "opaque") return false;
  const tur = (res.headers.get("content-type") || "").toLowerCase();
  const yol = new URL(req.url).pathname;
  if (yol.endsWith(".js")) return tur.includes("javascript");
  if (yol.endsWith(".css")) return tur.includes("css");
  if (yol.startsWith("/icons/")) return tur.startsWith("image/");
  if (req.mode === "navigate") return tur.includes("text/html");
  return true;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
  if (isStatic) {
    // Önce önbellek, yoksa ağ; yalnızca başarılı yanıt saklanır.
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (saklanabilir(req, res)) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }
  // Sayfalar: önce ağ; ağ yoksa önbellekteki son iyi kopya
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (saklanabilir(req, res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => {
            if (hit) return hit;
            // Ana sayfa dışındaki bir adres için başka sayfa gösterme; açık hata sayfası ver
            if (url.pathname === "/") return caches.match("/").then((k) => k || baglantiHatasi(url.pathname));
            return baglantiHatasi(url.pathname);
          }),
        ),
    );
  }
});

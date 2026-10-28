/* Eviko Teklif — hafif servis çalışanı: yalnızca uygulama kabuğu (statik dosyalar) önbelleğe alınır.
   Müşteri/proje verisi IndexedDB'de durur; bu dosya ona ASLA dokunmaz.
   v2: başarısız (404/500/HTML) yanıtlar artık önbelleğe alınmaz; eski önbellekler silinir. */
const CACHE = "eviko-shell-v2";

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
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
  }
});

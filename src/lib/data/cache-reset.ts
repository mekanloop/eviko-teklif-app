/**
 * Uygulama dosyası önbelleğini (Cache Storage) ve servis çalışanını temizler.
 * Müşteri/proje/fiyat verisinin durduğu IndexedDB'ye DOKUNMAZ.
 */
export async function onbellekTemizle(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

const BAYRAK = "eviko-onbellek-yenilendi";

/** Bozuk/eski JS parçası yüklenemezse bir kez önbelleği temizleyip sayfayı yeniler. */
export function parcaHatasiKurtar(): void {
  const kurtar = async (neden: string) => {
    try {
      if (sessionStorage.getItem(BAYRAK)) return; // sonsuz yenileme döngüsünü engelle
      sessionStorage.setItem(BAYRAK, neden);
    } catch {}
    await onbellekTemizle().catch(() => {});
    location.reload();
  };
  const parcaMi = (m: string) => /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported|Importing a module script failed|error loading dynamically imported module/i.test(m);
  window.addEventListener("error", (e) => {
    if (parcaMi(String(e.message ?? "")) || (e.target instanceof HTMLScriptElement && e.target.src.includes("/_next/static/"))) void kurtar("error");
  }, true);
  window.addEventListener("unhandledrejection", (e) => {
    const m = e.reason instanceof Error ? `${e.reason.name} ${e.reason.message}` : String(e.reason ?? "");
    if (parcaMi(m)) void kurtar("rejection");
  });
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ensureSeed } from "@/lib/data/actions";
import { onbellekTemizle, parcaHatasiKurtar } from "@/lib/data/cache-reset";

/** Veritabanını hazırlar (ilk açılışta varsayılanlar), servis çalışanını kaydeder. */
export function Boot({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    parcaHatasiKurtar();
    ensureSeed()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    try {
      // Verinin tarayıcı tarafından silinmesini engellemeye çalış
      void navigator.storage?.persist?.();
    } catch {}
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((r) => r.update()).catch(() => {});
    }
  }, []);

  if (error)
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <div className="text-lg font-bold text-red-700">Veritabanı açılamadı</div>
        <p className="mt-2 text-sm text-navy-600">
          Tarayıcı yerel depolamaya izin vermiyor olabilir (özel gezinti modu?). Safari'de normal sekmeden veya ana ekrana eklenmiş uygulamadan açın.
        </p>
        <p className="mt-2 text-xs text-navy-400">{error}</p>
      </div>
    );
  if (!ready) return <div className="p-10 text-center text-navy-400">Yükleniyor…</div>;
  return <>{children}</>;
}

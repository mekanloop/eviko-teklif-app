"use client";

import { Copy, Download, HardDriveDownload, X } from "lucide-react";
import { useState } from "react";
import { exportBackup } from "@/lib/data/backup";

/**
 * Her sayfada görünen yedek düğmesi: tüm veriyi (müşteri, proje, teklif, fiyat…) dosya olarak indirir
 * ya da metin olarak panoya kopyalar. Veriye dokunmaz, sadece okur.
 */
export function BackupFab() {
  const [acik, setAcik] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function metinAl(): Promise<{ json: string; ozet: string }> {
    const data = await exportBackup();
    const t = data.tablolar as Record<string, unknown[]>;
    return { json: JSON.stringify(data), ozet: `${t.customers?.length ?? 0} müşteri, ${t.projects?.length ?? 0} proje, ${t.quotes?.length ?? 0} teklif, ${t.products?.length ?? 0} ürün` };
  }

  async function indir() {
    try {
      const { json, ozet } = await metinAl();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      a.download = `eviko-yedek-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMesaj(`Yedek hazır: ${ozet}`);
    } catch (e) {
      setMesaj(`Hata: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function kopyala() {
    try {
      const { json, ozet } = await metinAl();
      await navigator.clipboard.writeText(json);
      setMesaj(`Panoya kopyalandı (${ozet}). Notlar uygulamasına yapıştırıp kendinize gönderin.`);
    } catch (e) {
      setMesaj(`Kopyalanamadı: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <div className="no-print fixed bottom-20 right-4 z-40 md:bottom-5">
      {acik && (
        <div className="mb-2 w-72 rounded-2xl border border-navy-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-bold text-navy-800">Veri yedeği</div>
            <button onClick={() => { setAcik(false); setMesaj(null); }} aria-label="Kapat"><X size={18} /></button>
          </div>
          <p className="mb-2 text-xs text-navy-500">Tüm verinizi bu cihazdan çıkarır. Verilerinize dokunmaz.</p>
          <div className="flex flex-col gap-2">
            <button className="btn btn-primary btn-sm" onClick={indir}><Download size={16} /> Dosya olarak indir</button>
            <button className="btn btn-ghost btn-sm" onClick={kopyala}><Copy size={16} /> Metin olarak kopyala</button>
          </div>
          {mesaj && <p className="mt-2 rounded-lg bg-navy-50 p-2 text-xs text-navy-700">{mesaj}</p>}
        </div>
      )}
      <button className="btn btn-accent shadow-lg" onClick={() => setAcik(!acik)} aria-label="Veri yedeği"><HardDriveDownload size={18} /> Yedek</button>
    </div>
  );
}

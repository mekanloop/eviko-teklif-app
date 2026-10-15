"use client";

import { Plus, Trash2 } from "lucide-react";
import { Loading, MoneyField, Select, TextInput, Toggle } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { uid } from "@/lib/db/ids";
import { useGiderler } from "@/lib/data/hooks";
import { GIDER_BIRIM_ETIKET, type GiderBirimi } from "@/lib/types";

const BIRIMLER = (Object.keys(GIDER_BIRIM_ETIKET) as GiderBirimi[]).map((v) => ({ value: v, label: GIDER_BIRIM_ETIKET[v] }));

/** Fiyat Listesi > Giderler: yemek, benzin gibi iş maliyetine giren günlük giderler. */
export function GiderManager() {
  const items = useGiderler();
  if (!items) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-bronze-200 bg-bronze-50 p-3 text-sm text-bronze-700">
        Her teklifte bu giderler otomatik <b>maliyete</b> eklenir: <b>kişi başı / gün</b> olanlar teklifteki toplam adam-gün ile, <b>iş günü başına</b> olanlar tekliftteki "teslim süresi (iş günü)" ile çarpılır. "Teklife yansıt" açıksa müşteri fiyatına da işçilik kâr oranıyla girer. Teklifte tek tek kapatılabilir.
      </div>
      <div className="card divide-y divide-navy-50">
        {items.length === 0 && <div className="p-6 text-center text-sm text-navy-400">Gider tanımı yok.</div>}
        {items.map((g) => (
          <div key={g.id} className="grid items-center gap-2 px-4 py-3 md:grid-cols-[1.2fr_1fr_160px_auto_auto_auto]">
            <TextInput value={g.ad} onChange={(v) => getDb().giderler.update(g.id, { ad: v })} />
            <Select value={g.birim} onChange={(v) => getDb().giderler.update(g.id, { birim: v })} options={BIRIMLER} />
            <MoneyField value={g.tutar} onChange={(k) => getDb().giderler.update(g.id, { tutar: k })} />
            <Toggle checked={g.yansit} onChange={(v) => getDb().giderler.update(g.id, { yansit: v })} label="Teklife yansıt" />
            <Toggle checked={g.aktif} onChange={(v) => getDb().giderler.update(g.id, { aktif: v })} label="Aktif" />
            <button className="btn btn-ghost btn-sm text-red-600" onClick={() => confirm(`${g.ad} silinsin mi?`) && getDb().giderler.delete(g.id)} aria-label="Sil"><Trash2 size={16} /></button>
          </div>
        ))}
        <div className="p-4">
          <button className="btn btn-ghost btn-sm" onClick={() => getDb().giderler.put({ id: uid(), ad: "Yeni gider", birim: "gun", tutar: 0, yansit: true, aktif: true })}><Plus size={16} /> Gider ekle</button>
        </div>
      </div>
    </div>
  );
}

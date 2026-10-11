"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatTL } from "@/lib/engine/money";
import { BIRIM_ETIKET, type Product } from "@/lib/types";
import { Empty, Modal, cx } from "./ui";

export function ProductPicker(props: { products: Product[]; selectedId?: string; onPick: (p: Product) => void; onClear?: () => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [kat, setKat] = useState("");
  const aktif = useMemo(() => props.products.filter((p) => p.aktif), [props.products]);
  const kategoriler = useMemo(() => Array.from(new Set(aktif.map((p) => p.kategori).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr")), [aktif]);
  const list = useMemo(() => {
    const s = q.toLocaleLowerCase("tr");
    return aktif
      .filter((p) => (!kat || p.kategori === kat) && (`${p.ad} ${p.kod} ${p.tedarikci} ${p.kategori}`.toLocaleLowerCase("tr").includes(s)))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
      .slice(0, 120);
  }, [aktif, q, kat]);

  return (
    <Modal title="Ürün seç" wide onClose={props.onClose} footer={props.onClear && <button className="btn btn-ghost" onClick={props.onClear}>Ürün seçimini kaldır (elle fiyat)</button>}>
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input autoFocus className="input pl-10" placeholder="Ürün adı, kod veya tedarikçi ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {kategoriler.length > 0 && (
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button className={cx("shrink-0 rounded-full px-3 py-1.5 text-sm font-medium", !kat ? "bg-navy-800 text-white" : "bg-navy-100 text-navy-600")} onClick={() => setKat("")}>Tümü</button>
          {kategoriler.map((k) => (
            <button key={k} className={cx("shrink-0 rounded-full px-3 py-1.5 text-sm font-medium", kat === k ? "bg-navy-800 text-white" : "bg-navy-100 text-navy-600")} onClick={() => setKat(k)}>{k}</button>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <Empty title="Ürün bulunamadı" sub="Fiyat Listesi ekranından ürün ekleyebilirsiniz." />
      ) : (
        <div className="divide-y divide-navy-100 rounded-xl border border-navy-100">
          {list.map((p) => (
            <button key={p.id} onClick={() => props.onPick(p)} className={cx("flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-navy-50", p.id === props.selectedId && "bg-bronze-50")}>
              <div className="min-w-0">
                <div className="truncate font-semibold text-navy-800">{p.ad}</div>
                <div className="truncate text-xs text-navy-400">{[p.tedarikci, p.kategori, p.kod].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-navy-800">{formatTL(p.netAlis)}</div>
                <div className="text-xs text-navy-400">/ {BIRIM_ETIKET[p.birim]}{p.kutuM2 ? ` · kutu ${p.kutuM2} m²` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

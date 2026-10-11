"use client";

import { Package, Plus, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import type { LineResult } from "@/lib/engine/calc";
import { formatSayi, formatTL } from "@/lib/engine/money";
import { uid } from "@/lib/db/ids";
import { BASIS_ETIKET, BIRIM_ETIKET, type Basis, type Birim, type LaborType, type LineDef, type Product } from "@/lib/types";
import { ProductPicker } from "./ProductPicker";
import { MoneyField, NumField, Select, TextInput, Toggle, cx } from "./ui";

const BASIS_OPT = (Object.keys(BASIS_ETIKET) as Basis[]).map((v) => ({ value: v, label: BASIS_ETIKET[v] }));
const BIRIM_OPT = (Object.keys(BIRIM_ETIKET) as Birim[]).filter((b) => b !== "gun").map((v) => ({ value: v, label: BIRIM_ETIKET[v] }));

export function LineEditor(props: {
  lines: LineDef[];
  onChange: (lines: LineDef[]) => void;
  products: Product[];
  labor: LaborType[];
  results?: Record<string, LineResult>;
  showCost?: boolean;
  readOnly?: boolean;
  fireVarsayilan?: number;
}) {
  const [picking, setPicking] = useState<string | null>(null);
  const { lines, readOnly } = props;

  const set = (id: string, patch: Partial<LineDef>) => props.onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => props.onChange(lines.filter((l) => l.id !== id));
  const urunAd = (id?: string) => props.products.find((p) => p.id === id);

  return (
    <div className="space-y-2">
      {lines.map((l) => {
        const r = props.results?.[l.id];
        const urun = urunAd(l.productId);
        return (
          <div key={l.id} className={cx("rounded-xl border p-3", l.kind === "iscilik" ? "border-bronze-200 bg-bronze-50/50" : "border-navy-100 bg-navy-50/40", r?.eksikFiyat && "!border-amber-300")}>
            <div className="flex items-start gap-2">
              <div className={cx("mt-2.5 shrink-0", l.kind === "iscilik" ? "text-bronze-600" : "text-navy-500")}>
                {l.kind === "iscilik" ? <Wrench size={16} /> : <Package size={16} />}
              </div>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-12">
                <div className="sm:col-span-12 lg:col-span-4">
                  <TextInput disabled={readOnly} value={l.label} onChange={(v) => set(l.id, { label: v })} placeholder="Satır adı" />
                </div>
                {l.kind === "malzeme" ? (
                  <>
                    <div className="sm:col-span-6 lg:col-span-4">
                      <button disabled={readOnly} onClick={() => setPicking(l.id)} className="input flex items-center justify-between gap-2 text-left disabled:opacity-60">
                        <span className={cx("truncate", !urun && "text-navy-300")}>{urun ? urun.ad : "Ürün seç / elle fiyat"}</span>
                        {urun && <span className="shrink-0 text-xs text-navy-400">{formatTL(urun.netAlis)}</span>}
                      </button>
                    </div>
                    {!urun && (
                      <div className="sm:col-span-6 lg:col-span-4">
                        <MoneyField disabled={readOnly} value={l.manuelBirimMaliyet ?? 0} onChange={(k) => set(l.id, { manuelBirimMaliyet: k })} placeholder="Birim maliyet" />
                      </div>
                    )}
                    <div className="sm:col-span-4 lg:col-span-3">
                      <Select disabled={readOnly} value={l.basis} onChange={(v) => set(l.id, { basis: v })} options={BASIS_OPT} />
                    </div>
                    <div className="sm:col-span-4 lg:col-span-2">
                      <NumField disabled={readOnly} value={l.carpan} onChange={(v) => set(l.id, { carpan: v ?? 0 })} suffix={l.basis === "sabit" ? BIRIM_ETIKET[l.birim] : "×"} />
                    </div>
                    {!urun && (
                      <div className="sm:col-span-4 lg:col-span-2">
                        <Select disabled={readOnly} value={l.birim} onChange={(v) => set(l.id, { birim: v })} options={BIRIM_OPT} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0 sm:col-span-12 lg:col-span-8">
                      <Toggle disabled={readOnly} checked={l.fire} onChange={(v) => set(l.id, { fire: v })} label="Fire" />
                      <Toggle disabled={readOnly} checked={!!l.metindeGoster} onChange={(v) => set(l.id, { metindeGoster: v })} label="Metinde marka/ürün adı geçsin" />
                      {l.fire && (
                        <div className="w-24">
                          <NumField disabled={readOnly} value={l.fireYuzde} onChange={(v) => set(l.id, { fireYuzde: v })} placeholder={String(props.fireVarsayilan ?? 10)} suffix="%" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sm:col-span-6 lg:col-span-4">
                      <Select disabled={readOnly} value={l.laborTypeId ?? ""} onChange={(v) => set(l.id, { laborTypeId: v })} placeholder="Usta türü" options={props.labor.filter((u) => u.aktif || u.id === l.laborTypeId).map((u) => ({ value: u.id, label: `${u.ad} (${formatTL(u.yevmiye)}/gün)` }))} />
                    </div>
                    <div className="sm:col-span-3 lg:col-span-2">
                      <NumField disabled={readOnly} value={l.gun} onChange={(v) => set(l.id, { gun: v ?? 0 })} suffix="gün" />
                    </div>
                    <div className="sm:col-span-3 lg:col-span-2">
                      <NumField disabled={readOnly} value={l.kisi ?? 1} onChange={(v) => set(l.id, { kisi: v ?? 1 })} suffix="kişi" />
                    </div>
                  </>
                )}
              </div>
              {!readOnly && (
                <button className="btn btn-ghost btn-sm !px-2 text-red-600" onClick={() => remove(l.id)} aria-label="Satırı sil"><Trash2 size={16} /></button>
              )}
            </div>
            {r && (
              <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-navy-500">
                {r.eksikFiyat && <span className="mr-auto font-semibold text-amber-700">⚠ Fiyat/yevmiye girilmemiş</span>}
                <span>
                  {formatSayi(r.miktar)} {r.birim}{r.kutu ? ` (${r.kutu} kutu)` : ""}
                </span>
                {props.showCost && <span>Maliyet <b className="text-navy-700">{formatTL(r.maliyet)}</b></span>}
                <span>Satış <b className="text-navy-800">{formatTL(r.satis)}</b></span>
              </div>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => props.onChange([...lines, { id: uid(), kind: "malzeme", label: "Malzeme", birim: "adet", basis: "sabit", carpan: 1, fire: false, manuelBirimMaliyet: 0 }])}>
            <Plus size={16} /> Malzeme satırı
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => props.onChange([...lines, { id: uid(), kind: "iscilik", label: "İşçilik", birim: "gun", basis: "sabit", carpan: 1, fire: false, gun: 1, kisi: 1 }])}>
            <Plus size={16} /> İşçilik satırı
          </button>
        </div>
      )}
      {picking && (
        <ProductPicker
          products={props.products}
          selectedId={lines.find((l) => l.id === picking)?.productId}
          onClose={() => setPicking(null)}
          onClear={() => {
            set(picking, { productId: undefined });
            setPicking(null);
          }}
          onPick={(p) => {
            set(picking, { productId: p.id, birim: p.birim });
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

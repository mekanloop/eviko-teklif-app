"use client";

import { ImagePlus, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, DatalistOptions, Empty, Field, Loading, Modal, MoneyField, TextArea, TextInput, Toggle } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { nowIso, uid } from "@/lib/db/ids";
import { useCabinets } from "@/lib/data/hooks";
import { formatTL } from "@/lib/engine/money";
import type { Cabinet } from "@/lib/types";

/** Görseli en fazla 900px'e küçültüp JPEG data URL yapar (yerel depoyu şişirmemek için). */
export async function gorselKucult(file: File, maks = 900): Promise<string> {
  const bmp = await createImageBitmap(file);
  const oran = Math.min(1, maks / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * oran);
  c.height = Math.round(bmp.height * oran);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

const bos = (): Cabinet => ({ id: uid(), ad: "", tedarikci: "", kategori: "Lavabo dolabı", fiyatM2: 0, renkler: [], aktif: true, guncellendi: nowIso() });

export function CabinetManager() {
  const items = useCabinets();
  const [edit, setEdit] = useState<Cabinet | null>(null);
  const [yeniRenk, setYeniRenk] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  if (!items) return <Loading />;
  const tedarikciler = items.map((c) => c.tedarikci);
  const kategoriler = items.map((c) => c.kategori);

  async function kaydet() {
    if (!edit || !edit.ad.trim()) return;
    await getDb().cabinets.put({ ...edit, ad: edit.ad.trim(), guncellendi: nowIso() });
    setEdit(null);
  }

  function renkEkle() {
    const r = yeniRenk.trim();
    if (!r || !edit) return;
    if (!edit.renkler.includes(r)) setEdit({ ...edit, renkler: [...edit.renkler, r] });
    setYeniRenk("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-bronze-200 bg-bronze-50 p-3 text-sm text-bronze-700">
        Dolap modelini bir kez buraya girin: <b>m² fiyatı</b>, <b>renk seçenekleri</b> ve model görseli. Teklifte mekana dolap eklerken modeli ve rengi seçer, ölçüsünü yazarsınız; m² × fiyat maliyete ve teklife eklenir.
      </div>
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={() => setEdit(bos())}><Plus size={18} /> Yeni dolap modeli</button>
      </div>
      {items.length === 0 ? (
        <Empty title="Dolap kataloğu boş" sub="Dolap modellerini ve m² fiyatlarını ekleyin." action={<button className="btn btn-primary" onClick={() => setEdit(bos())}>İlk modeli ekle</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <button key={c.id} onClick={() => setEdit(c)} className="card overflow-hidden text-left transition hover:border-navy-300">
              {c.gorsel ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.gorsel} alt={c.ad} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center bg-navy-50 text-sm text-navy-300">Görsel yok</div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="truncate font-bold text-navy-800">{c.ad}</div><div className="truncate text-xs text-navy-400">{[c.tedarikci, c.kategori].filter(Boolean).join(" · ")}</div></div>
                  <div className="shrink-0 text-right"><div className="font-bold">{c.fiyatM2 > 0 ? formatTL(c.fiyatM2) : <Badge tone="amber">Fiyat yok</Badge>}</div><div className="text-xs text-navy-400">/ m²</div></div>
                </div>
                {c.renkler.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.renkler.map((r) => <Badge key={r}>{r}</Badge>)}</div>}
                {!c.aktif && <div className="mt-2"><Badge>Pasif</Badge></div>}
              </div>
            </button>
          ))}
        </div>
      )}

      <DatalistOptions id="dolap-tedarikciler" values={tedarikciler} />
      <DatalistOptions id="dolap-kategoriler" values={["Lavabo dolabı", "Havlu dolabı", "Boy dolap", "Mutfak dolabı", ...kategoriler]} />

      {edit && (
        <Modal
          wide
          title={items.some((c) => c.id === edit.id) ? "Dolap modelini düzenle" : "Yeni dolap modeli"}
          onClose={() => setEdit(null)}
          footer={
            <>
              {items.some((c) => c.id === edit.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Dolap modeli silinsin mi? Tekliflerde bu modele bağlı dolaplar fiyatsız görünür.")) { await getDb().cabinets.delete(edit.id); setEdit(null); } }}>Sil</button>}
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>Vazgeç</button>
              <button className="btn btn-primary" disabled={!edit.ad.trim()} onClick={kaydet}>Kaydet</button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Model adı" className="sm:col-span-2"><TextInput autoFocus value={edit.ad} onChange={(v) => setEdit({ ...edit, ad: v })} placeholder="Örn. Nova Lavabo Dolabı" /></Field>
            <Field label="Tedarikçi / üretici"><TextInput list="dolap-tedarikciler" value={edit.tedarikci} onChange={(v) => setEdit({ ...edit, tedarikci: v })} /></Field>
            <Field label="Kategori"><TextInput list="dolap-kategoriler" value={edit.kategori} onChange={(v) => setEdit({ ...edit, kategori: v })} /></Field>
            <Field label="m² fiyatı (net, KDV hariç)" hint="Dolap alanı m² × bu fiyat = maliyet"><MoneyField value={edit.fiyatM2} onChange={(k) => setEdit({ ...edit, fiyatM2: k })} /></Field>
            <div className="flex items-end"><Toggle checked={edit.aktif} onChange={(v) => setEdit({ ...edit, aktif: v })} label="Aktif" /></div>

            <div className="sm:col-span-2">
              <div className="label">Renk seçenekleri</div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {edit.renkler.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-3 py-1 text-sm font-medium text-navy-700">
                    {r}
                    <button onClick={() => setEdit({ ...edit, renkler: edit.renkler.filter((x) => x !== r) })} aria-label={`${r} kaldır`}><X size={14} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <TextInput value={yeniRenk} onChange={setYeniRenk} placeholder="Renk adı (örn. Antrasit Mat) ve Enter" />
                <button className="btn btn-ghost" onClick={renkEkle}>Ekle</button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="label">Model görseli</div>
              <div className="flex items-center gap-3">
                {edit.gorsel ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={edit.gorsel} alt="" className="h-24 w-32 rounded-lg border border-navy-100 object-cover" />
                ) : <div className="flex h-24 w-32 items-center justify-center rounded-lg border border-dashed border-navy-200 text-xs text-navy-300">Yok</div>}
                <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Görsel yükle</button>
                {edit.gorsel && <button className="btn btn-danger btn-sm" onClick={() => setEdit({ ...edit, gorsel: undefined })}>Kaldır</button>}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEdit({ ...edit, gorsel: await gorselKucult(f) }); e.target.value = ""; }} />
              </div>
            </div>
            <Field label="Notlar" className="sm:col-span-2"><TextArea rows={2} value={edit.notlar ?? ""} onChange={(v) => setEdit({ ...edit, notlar: v })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

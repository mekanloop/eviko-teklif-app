"use client";

import { Download, Percent, Plus, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CabinetManager } from "@/components/CabinetManager";
import { GiderManager } from "@/components/GiderManager";
import { TemplateManager } from "@/components/TemplateManager";
import { Badge, DatalistOptions, Empty, Field, Loading, Modal, MoneyField, NumField, PageHeader, Select, Tabs, TextArea, TextInput, Toggle } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { nowIso, uid } from "@/lib/db/ids";
import { useLabor, useProducts } from "@/lib/data/hooks";
import { formatTL, parseTL, parseSayi } from "@/lib/engine/money";
import { BIRIM_ETIKET, type Birim, type Product } from "@/lib/types";

const BIRIMLER = (Object.keys(BIRIM_ETIKET) as Birim[]).filter((b) => b !== "gun").map((v) => ({ value: v, label: BIRIM_ETIKET[v] }));

const bosUrun = (): Product => ({ id: uid(), tedarikci: "", kategori: "", kod: "", ad: "", birim: "adet", netAlis: 0, aktif: true, guncellendi: nowIso() });

function csvEscape(s: string): string {
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsv(text: string): string[][] {
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) >= (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export default function PricesPage() {
  const products = useProducts();
  const labor = useLabor();
  const [tab, setTab] = useState<"urun" | "dolap" | "usta" | "gider" | "kalem">("urun");
  useEffect(() => {
    if (location.hash === "#kalemler") setTab("kalem");
    else if (location.hash === "#ustalar") setTab("usta");
    else if (location.hash === "#dolaplar") setTab("dolap");
    else if (location.hash === "#giderler") setTab("gider");
  }, []);
  const [q, setQ] = useState("");
  const [ted, setTed] = useState("");
  const [kat, setKat] = useState("");
  const [edit, setEdit] = useState<Product | null>(null);
  const [zam, setZam] = useState(false);
  const [zamYuzde, setZamYuzde] = useState<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const s = q.toLocaleLowerCase("tr");
    return (products ?? [])
      .filter((p) => (!ted || p.tedarikci === ted) && (!kat || p.kategori === kat) && `${p.ad} ${p.kod} ${p.tedarikci} ${p.kategori}`.toLocaleLowerCase("tr").includes(s))
      .sort((a, b) => a.tedarikci.localeCompare(b.tedarikci, "tr") || a.ad.localeCompare(b.ad, "tr"));
  }, [products, q, ted, kat]);

  if (!products || !labor) return <Loading />;
  const tedarikciler = Array.from(new Set(products.map((p) => p.tedarikci).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
  const kategoriler = Array.from(new Set(products.map((p) => p.kategori).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
  const eksikUsta = labor.filter((u) => u.aktif && u.yevmiye <= 0).length;

  async function saveProduct() {
    if (!edit || !edit.ad.trim()) return;
    await getDb().products.put({ ...edit, ad: edit.ad.trim(), guncellendi: nowIso() });
    setEdit(null);
  }

  async function applyZam() {
    if (zamYuzde == null || zamYuzde === 0) return;
    if (!confirm(`Listelenen ${list.length} ürünün fiyatı %${zamYuzde} değişecek. Onaylıyor musunuz?`)) return;
    const now = nowIso();
    await getDb().products.bulkPut(list.map((p) => ({ ...p, netAlis: Math.round((p.netAlis * (100 + zamYuzde)) / 100), guncellendi: now })));
    setZam(false);
    setZamYuzde(undefined);
  }

  function exportCsv() {
    const head = ["tedarikci", "kategori", "kod", "ad", "birim", "netAlis_TL", "kutuM2", "notlar"];
    const rows = products!.map((p) => [p.tedarikci, p.kategori, p.kod, p.ad, p.birim, String(p.netAlis / 100).replace(".", ","), p.kutuM2 ? String(p.kutuM2).replace(".", ",") : "", p.notlar ?? ""].map(csvEscape).join(";"));
    const blob = new Blob(["﻿" + [head.join(";"), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fiyat-listesi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function importCsv(file: File) {
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return alert("Dosyada veri satırı bulunamadı.");
    const head = rows[0].map((h) => h.replace(/^﻿/, "").trim().toLocaleLowerCase("tr"));
    const idx = (...names: string[]) => head.findIndex((h) => names.includes(h));
    const iAd = idx("ad", "ürün", "urun", "ürün adı");
    const iFiyat = idx("netalis_tl", "netalis", "fiyat", "net alış", "net alis");
    if (iAd < 0 || iFiyat < 0) return alert("Başlık satırında en az 'ad' ve 'netAlis_TL' sütunları olmalı.");
    const iTed = idx("tedarikci", "tedarikçi", "marka");
    const iKat = idx("kategori");
    const iKod = idx("kod", "model");
    const iBirim = idx("birim");
    const iKutu = idx("kutum2", "kutu m2");
    const iNot = idx("notlar", "not");
    const mevcut = new Map(products!.map((p) => [`${p.tedarikci}|${p.kod}|${p.ad}`.toLocaleLowerCase("tr"), p]));
    const out: Product[] = [];
    let atlanan = 0;
    for (const r of rows.slice(1)) {
      const ad = (r[iAd] ?? "").trim();
      const fiyat = parseTL(r[iFiyat] ?? "");
      if (!ad || fiyat === null) { atlanan++; continue; }
      const birimRaw = (iBirim >= 0 ? r[iBirim] : "").trim().toLocaleLowerCase("tr").replace("²", "2");
      const birim = (Object.keys(BIRIM_ETIKET) as Birim[]).find((b) => b === birimRaw || BIRIM_ETIKET[b].toLocaleLowerCase("tr").replace("²", "2") === birimRaw) ?? "adet";
      const tedarikci = iTed >= 0 ? (r[iTed] ?? "").trim() : "";
      const kod = iKod >= 0 ? (r[iKod] ?? "").trim() : "";
      const key = `${tedarikci}|${kod}|${ad}`.toLocaleLowerCase("tr");
      const eski = mevcut.get(key);
      out.push({
        id: eski?.id ?? uid(),
        tedarikci,
        kategori: iKat >= 0 ? (r[iKat] ?? "").trim() : "",
        kod,
        ad,
        birim,
        netAlis: fiyat,
        kutuM2: iKutu >= 0 ? (parseSayi(r[iKutu] ?? "") ?? undefined) || undefined : undefined,
        notlar: iNot >= 0 ? (r[iNot] ?? "").trim() : "",
        aktif: true,
        guncellendi: nowIso(),
      });
    }
    if (!confirm(`${out.length} ürün içe aktarılacak (aynı tedarikçi+kod+ad olanlar güncellenir).${atlanan ? ` ${atlanan} satır atlandı.` : ""} Devam?`)) return;
    await getDb().products.bulkPut(out);
  }

  return (
    <>
      <PageHeader
        title="Fiyat Listesi"
        sub={tab === "kalem" ? "Elektrik, su tesisatı, seramik… her işin yevmiye + malzeme maliyeti" : `${products.length} ürün · net alış fiyatları KDV hariçtir`}
        actions={
          tab === "urun" ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Upload size={16} /> CSV içe aktar</button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} />
              <button className="btn btn-ghost btn-sm" onClick={exportCsv}><Download size={16} /> CSV indir</button>
              <button className="btn btn-primary" onClick={() => setEdit(bosUrun())}><Plus size={18} /> Yeni ürün</button>
            </>
          ) : undefined
        }
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "urun", label: "Ürünler", count: products.length }, { value: "dolap", label: "Dolap kataloğu" }, { value: "usta", label: "Ustalar / yevmiye", count: eksikUsta }, { value: "gider", label: "Giderler" }, { value: "kalem", label: "İş kalemleri" }]} />

      {tab === "urun" && (
        <>
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_200px_200px_auto]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input className="input pl-10" placeholder="Ürün, kod, tedarikçi ara…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={ted} onChange={setTed} placeholder="Tüm tedarikçiler" options={tedarikciler.map((t) => ({ value: t, label: t }))} />
            <Select value={kat} onChange={setKat} placeholder="Tüm kategoriler" options={kategoriler.map((t) => ({ value: t, label: t }))} />
            <button className="btn btn-ghost" disabled={list.length === 0} onClick={() => setZam(true)}><Percent size={16} /> Toplu fiyat değişimi</button>
          </div>
          {list.length === 0 ? (
            <Empty title={products.length === 0 ? "Fiyat listesi boş" : "Sonuç yok"} sub="Ürünleri tek tek ekleyebilir veya CSV dosyasından toplu yükleyebilirsiniz. CSV sütunları: tedarikci; kategori; kod; ad; birim; netAlis_TL; kutuM2; notlar" action={products.length === 0 && <button className="btn btn-primary" onClick={() => setEdit(bosUrun())}>İlk ürünü ekle</button>} />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="border-b border-navy-100 bg-navy-50"><tr>
                    <th className="th">Ürün</th><th className="th">Tedarikçi</th><th className="th">Kategori</th><th className="th text-right">Net alış</th><th className="th">Birim</th>
                  </tr></thead>
                  <tbody className="divide-y divide-navy-50">
                    {list.map((p) => (
                      <tr key={p.id} className="cursor-pointer hover:bg-navy-50" onClick={() => setEdit(p)}>
                        <td className="td"><div className="font-semibold text-navy-800">{p.ad}</div>{(p.kod || p.renk || p.ebat) && <div className="text-xs text-navy-400">{[p.kod, p.ebat, p.renk, p.yuzey].filter(Boolean).join(" · ")}</div>}</td>
                        <td className="td text-navy-600">{p.tedarikci || "—"}</td>
                        <td className="td text-navy-600">{p.kategori || "—"}</td>
                        <td className="td text-right font-bold">{p.netAlis > 0 ? formatTL(p.netAlis) : <Badge tone="amber">Fiyat yok</Badge>}</td>
                        <td className="td text-navy-500">{BIRIM_ETIKET[p.birim]}{p.kutuM2 ? ` · kutu ${p.kutuM2} m²` : ""}{!p.aktif && <> <Badge>Pasif</Badge></>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "kalem" && <TemplateManager />}
      {tab === "dolap" && <CabinetManager />}
      {tab === "gider" && <GiderManager />}

      {tab === "usta" && (
        <div className="card divide-y divide-navy-50">
          <div className="px-4 py-3 text-sm text-navy-500">Usta türüne göre günlük yevmiye. Teklifte işçilik maliyeti = yevmiye × gün × kişi. Satış fiyatı işçilik kâr oranıyla hesaplanır.</div>
          {labor.map((u) => (
            <div key={u.id} className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_200px_auto]">
              <TextInput value={u.ad} onChange={(v) => getDb().labor.update(u.id, { ad: v })} />
              <MoneyField value={u.yevmiye} onChange={(k) => getDb().labor.update(u.id, { yevmiye: k })} placeholder="Yevmiye" />
              <Toggle checked={u.aktif} onChange={(v) => getDb().labor.update(u.id, { aktif: v })} label="Aktif" />
            </div>
          ))}
          <div className="p-4">
            <button className="btn btn-ghost btn-sm" onClick={() => getDb().labor.put({ id: uid(), ad: "Yeni usta türü", yevmiye: 0, aktif: true })}><Plus size={16} /> Usta türü ekle</button>
          </div>
        </div>
      )}

      <DatalistOptions id="tedarikciler" values={tedarikciler} />
      <DatalistOptions id="kategoriler" values={kategoriler} />

      {edit && (
        <Modal
          title={products.some((p) => p.id === edit.id) ? "Ürünü düzenle" : "Yeni ürün"}
          onClose={() => setEdit(null)}
          footer={
            <>
              {products.some((p) => p.id === edit.id) && (
                <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Ürün silinsin mi? Şablon ve tekliflerdeki bağlantısı koparsa o satırlar 'fiyat girilmemiş' görünür.")) { await getDb().products.delete(edit.id); setEdit(null); } }}>Sil</button>
              )}
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>Vazgeç</button>
              <button className="btn btn-primary" disabled={!edit.ad.trim()} onClick={saveProduct}>Kaydet</button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ürün adı" className="sm:col-span-2"><TextInput autoFocus value={edit.ad} onChange={(v) => setEdit({ ...edit, ad: v })} placeholder="Örn. Vitra Rustic 60x60 Zemin Seramiği" /></Field>
            <Field label="Tedarikçi / marka"><TextInput list="tedarikciler" value={edit.tedarikci} onChange={(v) => setEdit({ ...edit, tedarikci: v })} /></Field>
            <Field label="Kategori"><TextInput list="kategoriler" value={edit.kategori} onChange={(v) => setEdit({ ...edit, kategori: v })} placeholder="Seramik, Klozet, Batarya…" /></Field>
            <Field label="Model / kod"><TextInput value={edit.kod} onChange={(v) => setEdit({ ...edit, kod: v })} /></Field>
            <Field label="Birim"><Select value={edit.birim} onChange={(v) => setEdit({ ...edit, birim: v })} options={BIRIMLER} /></Field>
            <Field label="Net alış fiyatı (KDV hariç)"><MoneyField value={edit.netAlis} onChange={(k) => setEdit({ ...edit, netAlis: k })} /></Field>
            <Field label="Kutu başına m²" hint="Seramikte doluysa miktar tam kutuya yuvarlanır"><NumField value={edit.kutuM2} onChange={(v) => setEdit({ ...edit, kutuM2: v })} suffix="m²" /></Field>
            <Field label="Renk / desen" hint="Görsel prompt için"><TextInput value={edit.renk ?? ""} onChange={(v) => setEdit({ ...edit, renk: v })} placeholder="Antrasit, ceviz…" /></Field>
            <Field label="Ebat"><TextInput value={edit.ebat ?? ""} onChange={(v) => setEdit({ ...edit, ebat: v })} placeholder="60x60" /></Field>
            <Field label="Yüzey" className="sm:col-span-2"><TextInput value={edit.yuzey ?? ""} onChange={(v) => setEdit({ ...edit, yuzey: v })} placeholder="Mat, parlak, yarı mat, ahşap görünümlü…" /></Field>
            <Field label="Notlar" className="sm:col-span-2"><TextArea rows={2} value={edit.notlar ?? ""} onChange={(v) => setEdit({ ...edit, notlar: v })} /></Field>
            <div className="sm:col-span-2"><Toggle checked={edit.aktif} onChange={(v) => setEdit({ ...edit, aktif: v })} label="Aktif (tekliflerde seçilebilir)" /></div>
          </div>
        </Modal>
      )}

      {zam && (
        <Modal title="Toplu fiyat değişimi" onClose={() => setZam(false)} footer={<><button className="btn btn-ghost" onClick={() => setZam(false)}>Vazgeç</button><button className="btn btn-primary" disabled={!zamYuzde} onClick={applyZam}>Uygula</button></>}>
          <p className="mb-3 text-sm text-navy-600">Şu an listelenen <b>{list.length}</b> ürünün net alış fiyatına yüzde uygulanır (artış için +, indirim için −). Önce tedarikçi veya kategori filtresi seçerek kapsamı daraltabilirsiniz. Gönderilmiş tekliflerin fiyatı değişmez.</p>
          <Field label="Değişim yüzdesi"><NumField value={zamYuzde} onChange={setZamYuzde} suffix="%" placeholder="Örn. 8" /></Field>
        </Modal>
      )}
    </>
  );
}

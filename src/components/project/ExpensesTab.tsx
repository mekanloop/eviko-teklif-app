"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Empty, Field, Modal, MoneyField, Select, Stat, TextInput } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { todayIso, uid } from "@/lib/db/ids";
import { useExpenses } from "@/lib/data/hooks";
import { formatSayi, formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import type { Expense } from "@/lib/types";
import type { ProjectCtx } from "./ProjectContext";

const KAT = [
  { value: "malzeme", label: "Malzeme" },
  { value: "iscilik", label: "İşçilik / usta" },
  { value: "nakliye", label: "Nakliye / moloz" },
  { value: "diger", label: "Diğer" },
] as const;

export function ExpensesTab({ ctx }: { ctx: ProjectCtx }) {
  const items = useExpenses(ctx.project.id);
  const [edit, setEdit] = useState<Expense | null>(null);
  if (!items) return null;
  const f = ctx.finance;
  const yeni = (): Expense => ({ id: uid(), projectId: ctx.project.id, tarih: todayIso(), kategori: "malzeme", aciklama: "", tedarikci: "", tutar: 0 });
  const fark = f.gercekMaliyet - f.tahminiMaliyet;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Net satış (KDV hariç)" value={formatTL(f.netSatis)} sub="Teklif + onaylı ek işler" />
        <Stat label="Tahmini maliyet" value={formatTL(f.tahminiMaliyet)} sub="Tekliften" />
        <Stat label="Gerçek harcama" value={formatTL(f.gercekMaliyet)} sub={items.length ? `${fark > 0 ? "+" : "−"}${formatTL(Math.abs(fark))} tahmine göre` : "Henüz giriş yok"} tone={fark > 0 ? "warn" : "default"} />
        <Stat label="Gerçek kâr" value={`${formatTL(f.gercekKar)}`} sub={`%${formatSayi(f.gercekKarYuzde, 1)} · tahmini ${formatTL(f.tahminiKar)}`} tone={f.gercekKar < 0 ? "warn" : "good"} />
      </div>
      {items.length > 0 && (
        <div className="card grid gap-2 p-4 sm:grid-cols-4">
          {KAT.map((k) => (<div key={k.value}><div className="label !mb-0">{k.label}</div><div className="font-bold">{formatTL(f.harcamaKategori[k.value])}</div></div>))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-navy-800">Harcamalar</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit(yeni())}><Plus size={16} /> Harcama ekle</button>
      </div>
      {items.length === 0 ? <Empty title="Harcama girilmedi" sub="Aldığınız malzeme, ödediğiniz usta ve nakliye bedellerini girerek gerçek kârı görün." /> : (
        <div className="card divide-y divide-navy-50">
          {items.map((e) => (
            <button key={e.id} onClick={() => setEdit(e)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-navy-50">
              <div className="min-w-0"><div className="font-semibold text-navy-800">{e.aciklama || KAT.find((k) => k.value === e.kategori)?.label}</div><div className="text-xs text-navy-400">{formatTarih(e.tarih)} · {KAT.find((k) => k.value === e.kategori)?.label}{e.tedarikci ? ` · ${e.tedarikci}` : ""}</div></div>
              <div className="font-bold">{formatTL(e.tutar)}</div>
            </button>
          ))}
        </div>
      )}
      {edit && (
        <Modal title="Harcama" onClose={() => setEdit(null)} footer={<>
          {items.some((x) => x.id === edit.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Harcama silinsin mi?")) { await getDb().expenses.delete(edit.id); setEdit(null); } }}><Trash2 size={16} /></button>}
          <button className="btn btn-ghost" onClick={() => setEdit(null)}>Vazgeç</button>
          <button className="btn btn-primary" disabled={edit.tutar <= 0} onClick={async () => { await getDb().expenses.put(edit); setEdit(null); }}>Kaydet</button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tarih"><TextInput type="date" value={edit.tarih} onChange={(v) => setEdit({ ...edit, tarih: v })} /></Field>
            <Field label="Tutar (₺)"><MoneyField value={edit.tutar} onChange={(k) => setEdit({ ...edit, tutar: k })} /></Field>
            <Field label="Kategori"><Select value={edit.kategori} onChange={(v) => setEdit({ ...edit, kategori: v })} options={KAT.map((k) => ({ ...k }))} /></Field>
            <Field label="Tedarikçi / usta"><TextInput value={edit.tedarikci} onChange={(v) => setEdit({ ...edit, tedarikci: v })} /></Field>
            <Field label="Açıklama" className="sm:col-span-2"><TextInput value={edit.aciklama} onChange={(v) => setEdit({ ...edit, aciklama: v })} placeholder="Örn. Vitra seramik 23 kutu" /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

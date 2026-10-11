"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge, Empty, Field, Modal, MoneyField, Select, TextInput } from "@/components/ui";
import { SignaturePad } from "@/components/SignaturePad";
import { getDb } from "@/lib/db/schema";
import { todayIso, uid } from "@/lib/db/ids";
import { usePayments } from "@/lib/data/hooks";
import { formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import type { Payment } from "@/lib/types";
import type { ProjectCtx } from "./ProjectContext";

const SEKIL = [
  { value: "nakit", label: "Nakit" },
  { value: "havale", label: "Havale / EFT" },
  { value: "kart", label: "Kart" },
  { value: "cek", label: "Çek / senet" },
] as const;

export function PaymentsTab({ ctx }: { ctx: ProjectCtx }) {
  const { project, finance, quote } = ctx;
  const payments = usePayments(project.id);
  const [edit, setEdit] = useState<Payment | null>(null);
  if (!payments) return null;

  const plan = quote?.odemePlani ?? [];
  // Alınan ödemeler plana sırayla dağıtılır
  let kalanOdeme = finance.alinan;
  const planSatirlari = plan.map((p) => {
    const tutar = Math.round((finance.toplamBedel * p.yuzde) / 100);
    const odenen = Math.min(tutar, Math.max(0, kalanOdeme));
    kalanOdeme -= odenen;
    return { ...p, tutar, odenen };
  });

  const yeni = (): Payment => ({ id: uid(), projectId: project.id, tarih: todayIso(), aciklama: "", tutar: 0, sekil: "nakit" });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="label !mb-0">Toplam bedel</div><div className="text-2xl font-bold">{formatTL(finance.toplamBedel)}</div>{finance.ekIsler > 0 && <div className="text-xs text-navy-400">Ek işler dahil {formatTL(finance.ekIsler)}</div>}</div>
        <div className="card p-4"><div className="label !mb-0">Alınan</div><div className="text-2xl font-bold text-emerald-700">{formatTL(finance.alinan)}</div></div>
        <div className="card p-4"><div className="label !mb-0">Kalan bakiye</div><div className="text-2xl font-bold text-bronze-600">{formatTL(finance.kalan)}</div></div>
      </div>

      {!quote && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">Henüz onaylanmış teklif yok. Ödeme planı onaylanan tekliften gelir; yine de tahsilat girebilirsiniz.</div>}

      {planSatirlari.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-navy-100 bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-700">Ödeme planı</div>
          <div className="divide-y divide-navy-50">
            {planSatirlari.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><div className="truncate font-semibold text-navy-800">{p.ad}</div><div className="text-xs text-navy-400">%{p.yuzde}</div></div>
                <div className="flex items-center gap-3">
                  <div className="text-right"><div className="font-bold">{formatTL(p.tutar)}</div><div className="text-xs text-navy-400">alınan {formatTL(p.odenen)}</div></div>
                  <Badge tone={p.odenen >= p.tutar && p.tutar > 0 ? "green" : p.odenen > 0 ? "amber" : "gray"}>{p.odenen >= p.tutar && p.tutar > 0 ? "Ödendi" : p.odenen > 0 ? "Kısmi" : "Bekliyor"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-navy-800">Alınan ödemeler</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit(yeni())}><Plus size={16} /> Ödeme ekle</button>
      </div>
      {payments.length === 0 ? (
        <Empty title="Henüz ödeme alınmadı" />
      ) : (
        <div className="card divide-y divide-navy-50">
          {payments.map((p) => (
            <button key={p.id} onClick={() => setEdit(p)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-navy-50">
              <div className="min-w-0">
                <div className="font-semibold text-navy-800">{p.aciklama || "Ödeme"}</div>
                <div className="text-xs text-navy-400">{formatTarih(p.tarih)} · {SEKIL.find((s) => s.value === p.sekil)?.label}{p.imza ? " · imzalı" : ""}</div>
              </div>
              <div className="font-bold text-emerald-700">{formatTL(p.tutar)}</div>
            </button>
          ))}
        </div>
      )}

      {edit && (
        <Modal
          title={payments.some((p) => p.id === edit.id) ? "Ödemeyi düzenle" : "Ödeme ekle"}
          onClose={() => setEdit(null)}
          footer={
            <>
              {payments.some((p) => p.id === edit.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Ödeme kaydı silinsin mi?")) { await getDb().payments.delete(edit.id); setEdit(null); } }}><Trash2 size={16} /> Sil</button>}
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>Vazgeç</button>
              <button className="btn btn-primary" disabled={edit.tutar <= 0} onClick={async () => { await getDb().payments.put(edit); setEdit(null); }}>Kaydet</button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tarih"><TextInput type="date" value={edit.tarih} onChange={(v) => setEdit({ ...edit, tarih: v })} /></Field>
            <Field label="Tutar (₺)"><MoneyField value={edit.tutar} onChange={(k) => setEdit({ ...edit, tutar: k })} /></Field>
            <Field label="Açıklama" className="sm:col-span-2"><TextInput value={edit.aciklama} onChange={(v) => setEdit({ ...edit, aciklama: v })} placeholder="Örn. Kapora / malzeme avansı" /></Field>
            <Field label="Ödeme şekli" className="sm:col-span-2"><Select value={edit.sekil} onChange={(v) => setEdit({ ...edit, sekil: v })} options={SEKIL.map((s) => ({ ...s }))} /></Field>
            <div className="sm:col-span-2">
              <div className="label">Müşteri imzası (isteğe bağlı)</div>
              <SignaturePad value={edit.imza} onChange={(imza) => setEdit({ ...edit, imza })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

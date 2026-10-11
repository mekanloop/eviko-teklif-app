"use client";

import { Check, FileDown, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Empty, Field, Modal, MoneyField, TextArea, TextInput } from "@/components/ui";
import { SignaturePad } from "@/components/SignaturePad";
import { getDb } from "@/lib/db/schema";
import { todayIso, uid } from "@/lib/db/ids";
import { useExtraJobs } from "@/lib/data/hooks";
import { formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import type { ExtraJob } from "@/lib/types";
import type { ProjectCtx } from "./ProjectContext";

export function ExtraJobsTab({ ctx }: { ctx: ProjectCtx }) {
  const jobs = useExtraJobs(ctx.project.id);
  const [edit, setEdit] = useState<ExtraJob | null>(null);
  if (!jobs) return null;
  const yeni = (): ExtraJob => ({ id: uid(), projectId: ctx.project.id, tarih: todayIso(), baslik: "", aciklama: "", tutar: 0, maliyet: 0, durum: "bekliyor" });
  const tone = { bekliyor: "amber", onaylandi: "green", reddedildi: "red" } as const;
  const etiket = { bekliyor: "Onay bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi" } as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-navy-800">Ek işler</h3>
          <p className="text-sm text-navy-500">Onaylı teklifin dışında müşterinin sonradan istediği işler. Onaylanınca toplam bedele eklenir.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit(yeni())}><Plus size={16} /> Ek iş</button>
      </div>
      {jobs.length === 0 ? (
        <Empty title="Ek iş yok" />
      ) : (
        <div className="card divide-y divide-navy-50">
          {jobs.map((j) => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(j)}>
                <div className="font-semibold text-navy-800">{j.baslik || "Ek iş"}</div>
                <div className="truncate text-sm text-navy-400">{formatTarih(j.tarih)} · {j.aciklama}</div>
              </button>
              <Badge tone={tone[j.durum]}>{etiket[j.durum]}</Badge>
              <div className="w-28 text-right font-bold">{formatTL(j.tutar)}</div>
              <Link href={`/projeler/${ctx.project.id}/belge/ek-is/${j.id}`} className="btn btn-ghost btn-sm"><FileDown size={16} /> Form</Link>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <Modal
          wide
          title={jobs.some((j) => j.id === edit.id) ? "Ek işi düzenle" : "Yeni ek iş"}
          onClose={() => setEdit(null)}
          footer={
            <>
              {jobs.some((j) => j.id === edit.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (confirm("Ek iş silinsin mi?")) { await getDb().extraJobs.delete(edit.id); setEdit(null); } }}><Trash2 size={16} /></button>}
              {edit.durum === "bekliyor" && edit.baslik.trim() && (
                <>
                  <button className="btn btn-danger" onClick={async () => { await getDb().extraJobs.put({ ...edit, durum: "reddedildi" }); setEdit(null); }}><X size={16} /> Reddedildi</button>
                  <button className="btn btn-accent" disabled={edit.tutar <= 0} onClick={async () => { await getDb().extraJobs.put({ ...edit, durum: "onaylandi" }); setEdit(null); }}><Check size={16} /> Onaylandı</button>
                </>
              )}
              {edit.durum !== "bekliyor" && <button className="btn btn-ghost" onClick={async () => { await getDb().extraJobs.put({ ...edit, durum: "bekliyor" }); setEdit(null); }}>Onay bekliyora al</button>}
              <button className="btn btn-primary" disabled={!edit.baslik.trim()} onClick={async () => { await getDb().extraJobs.put(edit); setEdit(null); }}>Kaydet</button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Başlık" className="sm:col-span-2"><TextInput autoFocus value={edit.baslik} onChange={(v) => setEdit({ ...edit, baslik: v })} placeholder="Örn. Ek niş yapımı" /></Field>
            <Field label="Açıklama / kapsam" className="sm:col-span-2"><TextArea rows={3} value={edit.aciklama} onChange={(v) => setEdit({ ...edit, aciklama: v })} /></Field>
            <Field label="Tarih"><TextInput type="date" value={edit.tarih} onChange={(v) => setEdit({ ...edit, tarih: v })} /></Field>
            <div />
            <Field label="Müşteriye bedel (KDV hariç)"><MoneyField value={edit.tutar} onChange={(k) => setEdit({ ...edit, tutar: k })} /></Field>
            <Field label="Tahmini maliyetiniz" hint="Sadece kâr takibi için, müşteri görmez"><MoneyField value={edit.maliyet} onChange={(k) => setEdit({ ...edit, maliyet: k })} /></Field>
            <div className="sm:col-span-2">
              <div className="label">Müşteri onay imzası</div>
              <SignaturePad value={edit.imza} onChange={(imza) => setEdit({ ...edit, imza })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

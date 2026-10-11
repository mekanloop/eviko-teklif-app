"use client";

import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Empty, Field, Loading, Modal, PageHeader, Select, TextArea, TextInput, Toggle, cx } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { todayIso, uid } from "@/lib/db/ids";
import { useEvents, useProjects } from "@/lib/data/hooks";
import { formatTarih } from "@/lib/engine/text";
import type { CalEvent } from "@/lib/types";

const TUR = { kesif: "Keşif", teslim: "Teslim", is: "İş günü", hatirlatma: "Hatırlatma" } as const;
const TONE = { kesif: "blue", teslim: "green", is: "bronze", hatirlatma: "amber" } as const;
const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const events = useEvents();
  const projects = useProjects();
  const [cur, setCur] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sec, setSec] = useState<string>(todayIso());
  const [edit, setEdit] = useState<CalEvent | null>(null);

  const hucreler = useMemo(() => {
    const ilk = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const bosluk = (ilk.getDay() + 6) % 7;
    const gunSayisi = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const out: Array<string | null> = Array(bosluk).fill(null);
    for (let g = 1; g <= gunSayisi; g++) out.push(ymd(new Date(cur.getFullYear(), cur.getMonth(), g)));
    while (out.length % 7) out.push(null);
    return out;
  }, [cur]);

  if (!events || !projects) return <Loading />;
  const bugun = todayIso();
  const gunOlaylar = events.filter((e) => e.tarih === sec);
  const yeni = (tarih: string): CalEvent => ({ id: uid(), baslik: "", tarih, tur: "hatirlatma", tamam: false, not: "" });
  const gecmis = events.filter((e) => !e.tamam && e.tarih < bugun);

  return (
    <>
      <PageHeader title="Takvim" sub="Keşif, teslim, iş günleri ve hatırlatmalar" actions={<button className="btn btn-primary" onClick={() => setEdit(yeni(sec))}><Plus size={18} /> Yeni kayıt</button>} />
      {gecmis.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <b>{gecmis.length} gecikmiş:</b> {gecmis.slice(0, 4).map((e) => `${e.baslik} (${formatTarih(e.tarih)})`).join(" · ")}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <button className="btn btn-ghost btn-sm !px-2" onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
            <div className="font-bold capitalize text-navy-800">{cur.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</div>
            <button className="btn btn-ghost btn-sm !px-2" onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-navy-400">{GUNLER.map((g) => <div key={g}>{g}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {hucreler.map((d, i) => {
              if (!d) return <div key={i} />;
              const evs = events.filter((e) => e.tarih === d);
              return (
                <button key={d} onClick={() => setSec(d)} className={cx("flex min-h-[64px] flex-col rounded-xl border p-1.5 text-left", d === sec ? "border-navy-700 bg-navy-50" : "border-navy-100 hover:bg-navy-50", d === bugun && "ring-2 ring-bronze-400")}>
                  <span className="text-sm font-semibold text-navy-700">{Number(d.slice(8))}</span>
                  <span className="mt-auto flex flex-wrap gap-0.5">
                    {evs.slice(0, 3).map((e) => <span key={e.id} className={cx("h-1.5 w-1.5 rounded-full", e.tamam ? "bg-navy-200" : e.tur === "kesif" ? "bg-blue-500" : e.tur === "teslim" ? "bg-emerald-500" : e.tur === "is" ? "bg-bronze-500" : "bg-amber-500")} />)}
                    {evs.length > 3 && <span className="text-[10px] text-navy-400">+{evs.length - 3}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-2 font-bold text-navy-800">{formatTarih(sec)}</h2>
          {gunOlaylar.length === 0 ? <Empty title="Bu gün için kayıt yok" action={<button className="btn btn-ghost btn-sm" onClick={() => setEdit(yeni(sec))}>Kayıt ekle</button>} /> : (
            <div className="card divide-y divide-navy-50">
              {gunOlaylar.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <Toggle checked={e.tamam} onChange={(v) => getDb().events.update(e.id, { tamam: v })} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(e)}>
                    <div className={cx("truncate font-semibold", e.tamam ? "text-navy-300 line-through" : "text-navy-800")}>{e.baslik}</div>
                    <div className="text-xs text-navy-400">{e.saat ?? "Tüm gün"}{e.projectId ? ` · ${projects.find((p) => p.id === e.projectId)?.ad ?? ""}` : ""}</div>
                  </button>
                  <Badge tone={TONE[e.tur]}>{TUR[e.tur]}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {edit && (
        <Modal title={events.some((e) => e.id === edit.id) ? "Kaydı düzenle" : "Yeni kayıt"} onClose={() => setEdit(null)} footer={<>
          {events.some((e) => e.id === edit.id) && <button className="btn btn-danger mr-auto" onClick={async () => { await getDb().events.delete(edit.id); setEdit(null); }}><Trash2 size={16} /></button>}
          <button className="btn btn-ghost" onClick={() => setEdit(null)}>Vazgeç</button>
          <button className="btn btn-primary" disabled={!edit.baslik.trim()} onClick={async () => { await getDb().events.put({ ...edit, baslik: edit.baslik.trim() }); setSec(edit.tarih); setEdit(null); }}>Kaydet</button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Başlık" className="sm:col-span-2"><TextInput autoFocus value={edit.baslik} onChange={(v) => setEdit({ ...edit, baslik: v })} placeholder="Örn. Şevkat Hanım keşif" /></Field>
            <Field label="Tarih"><TextInput type="date" value={edit.tarih} onChange={(v) => setEdit({ ...edit, tarih: v })} /></Field>
            <Field label="Saat"><TextInput type="time" value={edit.saat ?? ""} onChange={(v) => setEdit({ ...edit, saat: v || undefined })} /></Field>
            <Field label="Tür"><Select value={edit.tur} onChange={(v) => setEdit({ ...edit, tur: v })} options={(Object.keys(TUR) as Array<keyof typeof TUR>).map((k) => ({ value: k, label: TUR[k] }))} /></Field>
            <Field label="Proje"><Select value={edit.projectId ?? ""} onChange={(v) => setEdit({ ...edit, projectId: v || undefined })} placeholder="Projesiz" options={projects.map((p) => ({ value: p.id, label: p.ad }))} /></Field>
            <Field label="Not" className="sm:col-span-2"><TextArea rows={2} value={edit.not} onChange={(v) => setEdit({ ...edit, not: v })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

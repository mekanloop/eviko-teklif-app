"use client";

import { Camera, Download, FileText, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Empty } from "@/components/ui";
import { getDb } from "@/lib/db/schema";
import { nowIso, uid } from "@/lib/db/ids";
import { useFiles } from "@/lib/data/hooks";
import { formatTarih } from "@/lib/engine/text";
import type { ProjectCtx } from "./ProjectContext";

export function FilesTab({ ctx }: { ctx: ProjectCtx }) {
  const files = useFiles(ctx.project.id);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => new Map((files ?? []).map((f) => [f.id, URL.createObjectURL(f.blob)])), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  async function add(list: FileList | null) {
    if (!list) return;
    const rows = Array.from(list).map((f) => ({ id: uid(), projectId: ctx.project.id, ad: f.name, tur: f.type, boyut: f.size, tarih: nowIso(), blob: f as Blob }));
    await getDb().files.bulkPut(rows);
  }

  if (!files) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-navy-800">Fotoğraf ve dosyalar</h3>
          <p className="text-sm text-navy-500">Keşif fotoğrafları, ölçü krokileri, sözleşme ve belgeler.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => camRef.current?.click()}><Camera size={16} /> Fotoğraf çek</button>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Upload size={16} /> Dosya yükle</button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
        </div>
      </div>
      {files.length === 0 ? <Empty title="Dosya yok" /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="card overflow-hidden">
              {f.tur.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls.get(f.id)} alt={f.ad} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center bg-navy-50 text-navy-300"><FileText size={40} /></div>
              )}
              <div className="p-2">
                <div className="truncate text-sm font-semibold text-navy-800">{f.ad}</div>
                <div className="text-xs text-navy-400">{formatTarih(f.tarih)} · {(f.boyut / 1024).toFixed(0)} KB</div>
                <div className="mt-1 flex gap-1">
                  <a className="btn btn-ghost btn-sm !min-h-[32px] flex-1" href={urls.get(f.id)} download={f.ad}><Download size={14} /></a>
                  <button className="btn btn-danger btn-sm !min-h-[32px]" onClick={async () => { if (confirm("Dosya silinsin mi?")) await getDb().files.delete(f.id); }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

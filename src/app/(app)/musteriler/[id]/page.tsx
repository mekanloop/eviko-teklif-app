"use client";

import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectBadge } from "@/components/badges";
import { Empty, Field, Loading, Modal, PageHeader, TextArea, TextInput } from "@/components/ui";
import { deleteCustomer, saveCustomer, saveProject } from "@/lib/data/actions";
import { useCustomer, useProjects } from "@/lib/data/hooks";
import type { Customer } from "@/lib/types";
import { formatTarih } from "@/lib/engine/text";

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const customer = useCustomer(id);
  const projects = useProjects();
  const router = useRouter();
  const [draft, setDraft] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [p, setP] = useState({ ad: "", adres: "" });

  useEffect(() => {
    if (customer && !draft) setDraft(customer);
  }, [customer, draft]);

  if (customer === undefined || !projects || !draft) return <Loading />;
  const mine = projects.filter((x) => x.customerId === id);

  function patch(k: keyof Customer, v: string) {
    const next = { ...draft!, [k]: v };
    setDraft(next);
    void saveCustomer(next);
  }

  async function addProject() {
    if (!p.ad.trim()) return;
    const pid = await saveProject({ customerId: id, ad: p.ad.trim(), adres: p.adres || customer?.adres || "" });
    setOpen(false);
    router.push(`/projeler/${pid}`);
  }

  async function remove() {
    if (!confirm(`${draft!.ad} silinsin mi?`)) return;
    const ok = await deleteCustomer(id);
    if (!ok) return alert("Bu müşterinin projeleri var. Önce projeleri silin.");
    router.push("/musteriler");
  }

  return (
    <>
      <PageHeader
        back={<Link href="/musteriler" className="mb-1 inline-flex items-center gap-1 text-sm text-navy-500"><ArrowLeft size={14} /> Müşteriler</Link>}
        title={draft.ad}
        actions={<button className="btn btn-danger btn-sm" onClick={remove}><Trash2 size={16} /> Sil</button>}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="card space-y-3 p-5">
          <Field label="Ad soyad / unvan"><TextInput value={draft.ad} onChange={(v) => patch("ad", v)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Telefon"><TextInput type="tel" value={draft.telefon} onChange={(v) => patch("telefon", v)} /></Field>
            <Field label="E-posta"><TextInput type="email" value={draft.eposta} onChange={(v) => patch("eposta", v)} /></Field>
          </div>
          <Field label="Adres"><TextInput value={draft.adres} onChange={(v) => patch("adres", v)} /></Field>
          <Field label="Notlar"><TextArea rows={4} value={draft.notlar} onChange={(v) => patch("notlar", v)} /></Field>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy-800">Projeler</h2>
            <button className="btn btn-primary btn-sm" onClick={() => { setP({ ad: "", adres: customer?.adres ?? "" }); setOpen(true); }}>
              <Plus size={16} /> Yeni proje
            </button>
          </div>
          {mine.length === 0 ? (
            <Empty title="Bu müşteri için proje yok" sub="Keşif, teklif ve iş akışı proje altında yürür." />
          ) : (
            <div className="space-y-2">
              {mine.map((x) => (
                <Link key={x.id} href={`/projeler/${x.id}`} className="card flex items-center justify-between gap-3 p-4 hover:border-navy-300">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy-800">{x.ad}</div>
                    <div className="truncate text-sm text-navy-400">{x.adres || "Adres yok"} · {formatTarih(x.olusturuldu)}</div>
                  </div>
                  <ProjectBadge durum={x.durum} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      {open && (
        <Modal title="Yeni proje" onClose={() => setOpen(false)} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Vazgeç</button><button className="btn btn-primary" disabled={!p.ad.trim()} onClick={addProject}>Oluştur</button></>}>
          <div className="space-y-3">
            <Field label="Proje adı"><TextInput autoFocus value={p.ad} onChange={(v) => setP({ ...p, ad: v })} placeholder="Örn. 2 Adet Banyonun Komple Yenilenmesi" /></Field>
            <Field label="İş adresi"><TextInput value={p.adres} onChange={(v) => setP({ ...p, adres: v })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

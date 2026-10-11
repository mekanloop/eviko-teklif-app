"use client";

import { Phone, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, Field, Loading, Modal, PageHeader, TextArea, TextInput } from "@/components/ui";
import { saveCustomer } from "@/lib/data/actions";
import { useCustomers, useProjects } from "@/lib/data/hooks";

export default function CustomersPage() {
  const customers = useCustomers();
  const projects = useProjects();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ad: "", telefon: "", eposta: "", adres: "", notlar: "" });

  if (!customers || !projects) return <Loading />;
  const list = customers.filter((c) => (c.ad + c.telefon + c.adres).toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));

  async function create() {
    if (!f.ad.trim()) return;
    const id = await saveCustomer({ ...f, ad: f.ad.trim() });
    setOpen(false);
    setF({ ad: "", telefon: "", eposta: "", adres: "", notlar: "" });
    router.push(`/musteriler/${id}`);
  }

  return (
    <>
      <PageHeader
        title="Müşteriler"
        sub={`${customers.length} kayıt`}
        actions={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={18} /> Yeni müşteri
          </button>
        }
      />
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-10" placeholder="Müşteri, telefon veya adres ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? (
        <Empty title={customers.length === 0 ? "Henüz müşteri yok" : "Sonuç bulunamadı"} sub="Müşteriyi kaydedip altına proje ve teklif açarsınız." action={customers.length === 0 && <button className="btn btn-primary" onClick={() => setOpen(true)}>İlk müşteriyi ekle</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const n = projects.filter((p) => p.customerId === c.id).length;
            return (
              <Link key={c.id} href={`/musteriler/${c.id}`} className="card block p-4 transition hover:border-navy-300">
                <div className="text-base font-bold text-navy-800">{c.ad}</div>
                {c.telefon && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-navy-500">
                    <Phone size={14} /> {c.telefon}
                  </div>
                )}
                {c.adres && <div className="mt-0.5 truncate text-sm text-navy-400">{c.adres}</div>}
                <div className="mt-2 text-xs font-semibold text-bronze-600">{n} proje</div>
              </Link>
            );
          })}
        </div>
      )}
      {open && (
        <Modal
          title="Yeni müşteri"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={create} disabled={!f.ad.trim()}>Kaydet</button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ad soyad / unvan" className="sm:col-span-2"><TextInput autoFocus value={f.ad} onChange={(v) => setF({ ...f, ad: v })} placeholder="Örn. Şevkat Hanım" /></Field>
            <Field label="Telefon"><TextInput type="tel" value={f.telefon} onChange={(v) => setF({ ...f, telefon: v })} /></Field>
            <Field label="E-posta"><TextInput type="email" value={f.eposta} onChange={(v) => setF({ ...f, eposta: v })} /></Field>
            <Field label="Adres" className="sm:col-span-2"><TextInput value={f.adres} onChange={(v) => setF({ ...f, adres: v })} /></Field>
            <Field label="Notlar" className="sm:col-span-2"><TextArea rows={3} value={f.notlar} onChange={(v) => setF({ ...f, notlar: v })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

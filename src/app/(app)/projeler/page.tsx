"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProjectBadge } from "@/components/badges";
import { Empty, Field, Loading, Modal, PageHeader, Select, Tabs, TextInput } from "@/components/ui";
import { saveProject } from "@/lib/data/actions";
import { useAllExtraJobs, useAllPayments, useCatalog, useCustomers, useProjects, useQuotes } from "@/lib/data/hooks";
import { calcOption } from "@/lib/engine/calc";
import { formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";

export default function ProjectsPage() {
  const projects = useProjects();
  const customers = useCustomers();
  const quotes = useQuotes();
  const payments = useAllPayments();
  const extras = useAllExtraJobs();
  const catalog = useCatalog();
  const router = useRouter();
  const [f, setF] = useState<"aktif" | "hepsi" | "kapali">("aktif");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [yeni, setYeni] = useState({ customerId: "", ad: "", adres: "" });

  const rows = useMemo(() => {
    if (!projects || !customers || !quotes || !payments || !extras || !catalog) return [];
    return projects
      .filter((p) => (f === "hepsi" ? true : f === "kapali" ? p.durum === "kapali" || p.durum === "iptal" : p.durum !== "kapali" && p.durum !== "iptal"))
      .map((p) => {
        const c = customers.find((x) => x.id === p.customerId);
        const oq = quotes.find((x) => x.id === p.onayliQuoteId);
        const o = oq ? (oq.secenekler.find((s) => s.id === oq.secilenSecenekId) ?? oq.secenekler[0]) : undefined;
        const sozlesme = oq && o ? calcOption(oq, o, catalog).genelToplam : 0;
        const ek = extras.filter((e) => e.projectId === p.id && e.durum === "onaylandi").reduce((a, e) => a + e.tutar, 0);
        const alinan = payments.filter((e) => e.projectId === p.id).reduce((a, e) => a + e.tutar, 0);
        return { p, musteri: c?.ad ?? "—", toplam: sozlesme + ek, kalan: sozlesme + ek - alinan, onayli: !!oq };
      })
      .filter((r) => `${r.p.ad} ${r.musteri} ${r.p.adres}`.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));
  }, [projects, customers, quotes, payments, extras, catalog, f, q]);

  if (!projects || !customers) return <Loading />;

  async function create() {
    if (!yeni.customerId || !yeni.ad.trim()) return;
    const c = customers!.find((x) => x.id === yeni.customerId);
    const id = await saveProject({ customerId: yeni.customerId, ad: yeni.ad.trim(), adres: yeni.adres || c?.adres || "" });
    setOpen(false);
    router.push(`/projeler/${id}`);
  }

  return (
    <>
      <PageHeader title="Projeler" sub="Keşiften ödemeye tüm iş akışı proje altında yürür" actions={<button className="btn btn-primary" onClick={() => { setYeni({ customerId: "", ad: "", adres: "" }); setOpen(true); }}><Plus size={18} /> Yeni proje</button>} />
      <Tabs value={f} onChange={setF} tabs={[{ value: "aktif", label: "Aktif" }, { value: "kapali", label: "Kapanan" }, { value: "hepsi", label: "Hepsi" }]} />
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-10" placeholder="Proje, müşteri veya adres ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {rows.length === 0 ? (
        <Empty title="Proje yok" sub="Önce müşteri oluşturun, sonra proje açın." action={customers.length === 0 ? <Link href="/musteriler" className="btn btn-primary">Müşteri ekle</Link> : <button className="btn btn-primary" onClick={() => setOpen(true)}>Proje oluştur</button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ p, musteri, toplam, kalan, onayli }) => (
            <Link key={p.id} href={`/projeler/${p.id}`} className="card block p-4 hover:border-navy-300">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-navy-800">{p.ad}</div>
                  <div className="truncate text-sm text-navy-500">{musteri}</div>
                </div>
                <ProjectBadge durum={p.durum} />
              </div>
              <div className="mt-1 truncate text-xs text-navy-400">{p.adres || "Adres yok"} · {formatTarih(p.olusturuldu)}</div>
              {onayli && (
                <div className="mt-3 flex justify-between border-t border-navy-50 pt-3 text-sm">
                  <div><div className="text-xs text-navy-400">Toplam bedel</div><div className="font-bold">{formatTL(toplam)}</div></div>
                  <div className="text-right"><div className="text-xs text-navy-400">Kalan</div><div className={kalan > 0 ? "font-bold text-bronze-600" : "font-bold text-emerald-600"}>{formatTL(kalan)}</div></div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
      {open && (
        <Modal title="Yeni proje" onClose={() => setOpen(false)} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Vazgeç</button><button className="btn btn-primary" disabled={!yeni.customerId || !yeni.ad.trim()} onClick={create}>Oluştur</button></>}>
          <div className="space-y-3">
            <Field label="Müşteri">
              <Select value={yeni.customerId} onChange={(v) => setYeni({ ...yeni, customerId: v })} placeholder="Müşteri seçin" options={customers.map((c) => ({ value: c.id, label: c.ad }))} />
              <Link href="/musteriler" className="mt-1 inline-block text-xs text-bronze-600 underline">Müşteri listede yok mu? Önce müşteriyi ekleyin</Link>
            </Field>
            <Field label="Proje adı"><TextInput value={yeni.ad} onChange={(v) => setYeni({ ...yeni, ad: v })} placeholder="Örn. 2 Adet Banyonun Komple Yenilenmesi" /></Field>
            <Field label="İş adresi"><TextInput value={yeni.adres} onChange={(v) => setYeni({ ...yeni, adres: v })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

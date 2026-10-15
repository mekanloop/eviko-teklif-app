"use client";

import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProjectBadge, QuoteBadge } from "@/components/badges";
import { DeliveriesTab } from "@/components/project/DeliveriesTab";
import { ExpensesTab } from "@/components/project/ExpensesTab";
import { ExtraJobsTab } from "@/components/project/ExtraJobsTab";
import { FilesTab } from "@/components/project/FilesTab";
import { PaymentsTab } from "@/components/project/PaymentsTab";
import type { ProjectCtx } from "@/components/project/ProjectContext";
import { Empty, Field, Loading, PageHeader, Select, Stat, Tabs, TextArea, TextInput, cx } from "@/components/ui";
import { createQuote, deleteProject, saveProject } from "@/lib/data/actions";
import { useCatalog, useCustomer, useExpenses, useExtraJobs, usePayments, useProject, useProjectQuotes } from "@/lib/data/hooks";
import { quoteTitle } from "@/lib/data/quote-ops";
import { calcOption } from "@/lib/engine/calc";
import { projectFinance } from "@/lib/engine/finance";
import { formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import { PROJE_DURUM_ETIKET, type ProjeDurum } from "@/lib/types";

type TabKey = "genel" | "teklifler" | "odemeler" | "ekisler" | "teslim" | "harcama" | "dosyalar";
const ASAMALAR: ProjeDurum[] = ["kesif", "teklif", "onayli", "uygulama", "teslim", "kapali"];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const project = useProject(id);
  const customer = useCustomer(project?.customerId ?? "");
  const quotes = useProjectQuotes(id);
  const payments = usePayments(id);
  const extras = useExtraJobs(id);
  const expenses = useExpenses(id);
  const catalog = useCatalog();
  const [tab, setTab] = useState<TabKey>("genel");

  const ctx = useMemo<ProjectCtx | undefined>(() => {
    if (!project || !quotes || !payments || !extras || !expenses || !catalog) return undefined;
    const quote = quotes.find((q) => q.id === project.onayliQuoteId);
    const opt = quote ? (quote.secenekler.find((o) => o.id === quote.secilenSecenekId) ?? quote.secenekler[0]) : undefined;
    const result = quote && opt ? calcOption(quote, opt, catalog) : undefined;
    return { project, customer, quote, result, finance: projectFinance(result, extras, payments, expenses) };
  }, [project, customer, quotes, payments, extras, expenses, catalog]);

  if (project === undefined || !ctx || !quotes) return <Loading />;
  if (!project) return <Empty title="Proje bulunamadı" action={<Link href="/projeler" className="btn btn-primary">Projelere dön</Link>} />;
  const f = ctx.finance;
  const patch = (p: Partial<typeof project>) => saveProject({ ...project, ...p });
  const roots = Array.from(new Set(quotes.map((q) => q.rootId)));
  const guncel = roots.map((r) => quotes.filter((q) => q.rootId === r).sort((a, b) => b.revNo - a.revNo)[0]);

  async function yeniTeklif(tur: "on" | "kesin") {
    const qid = await createQuote(project!.id, tur);
    router.push(`/teklifler/${qid}`);
  }

  return (
    <>
      <PageHeader
        back={<Link href={customer ? `/musteriler/${customer.id}` : "/projeler"} className="mb-1 inline-flex items-center gap-1 text-sm text-navy-500"><ArrowLeft size={14} /> {customer?.ad ?? "Projeler"}</Link>}
        title={project.ad}
        sub={<span className="inline-flex flex-wrap items-center gap-2"><ProjectBadge durum={project.durum} />{project.adres && <span>{project.adres}</span>}</span>}
        actions={<><Link href={`/projeler/${project.id}/dosya`} className="btn btn-ghost btn-sm">İş dosyası (kazanç)</Link><button className="btn btn-danger btn-sm" onClick={async () => { if (confirm("Proje ve tüm teklif/ödeme/belge kayıtları silinsin mi? Bu işlem geri alınamaz.")) { await deleteProject(project.id); router.push("/projeler"); } }}><Trash2 size={16} /></button></>}
      />

      {/* Aşama çubuğu */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {ASAMALAR.map((a, i) => {
          const idx = ASAMALAR.indexOf(project.durum as ProjeDurum);
          const done = idx >= i;
          return (
            <button key={a} onClick={() => patch({ durum: a })} className={cx("min-h-[40px] shrink-0 rounded-xl px-4 text-sm font-semibold", done ? "bg-bronze-500 text-white" : "bg-white text-navy-400")}>
              {i + 1}. {PROJE_DURUM_ETIKET[a]}
            </button>
          );
        })}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "genel", label: "Genel" },
          { value: "teklifler", label: "Teklifler", count: guncel.length },
          { value: "odemeler", label: "Ödemeler" },
          { value: "ekisler", label: "Ek işler", count: extras?.filter((e) => e.durum === "bekliyor").length },
          { value: "teslim", label: "Teslimler" },
          { value: "harcama", label: "Harcama & kâr" },
          { value: "dosyalar", label: "Dosyalar" },
        ]}
      />

      {tab === "genel" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            {ctx.quote && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Toplam bedel" value={formatTL(f.toplamBedel)} sub={f.ekIsler ? `Ek iş ${formatTL(f.ekIsler)} dahil` : "Onaylı teklif"} />
                <Stat label="Alınan" value={formatTL(f.alinan)} tone="good" />
                <Stat label="Kalan" value={formatTL(f.kalan)} tone={f.kalan > 0 ? "warn" : "good"} />
              </div>
            )}
            <div className="card space-y-3 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Proje adı" className="sm:col-span-2"><TextInput value={project.ad} onChange={(v) => patch({ ad: v })} /></Field>
                <Field label="İş adresi" className="sm:col-span-2"><TextInput value={project.adres} onChange={(v) => patch({ adres: v })} /></Field>
                <Field label="Aşama"><Select value={project.durum} onChange={(v) => patch({ durum: v })} options={(Object.keys(PROJE_DURUM_ETIKET) as ProjeDurum[]).map((d) => ({ value: d, label: PROJE_DURUM_ETIKET[d] }))} /></Field>
                <Field label="Keşif tarihi"><TextInput type="date" value={project.kesifTarihi ?? ""} onChange={(v) => patch({ kesifTarihi: v || undefined })} /></Field>
                <Field label="İş başlangıç"><TextInput type="date" value={project.baslangic ?? ""} onChange={(v) => patch({ baslangic: v || undefined })} /></Field>
                <Field label="İş bitiş"><TextInput type="date" value={project.bitis ?? ""} onChange={(v) => patch({ bitis: v || undefined })} /></Field>
              </div>
              <Field label="Notlar"><TextArea rows={4} value={project.notlar} onChange={(v) => patch({ notlar: v })} /></Field>
            </div>
          </div>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-navy-800">Müşteri</h3>{customer && <Link href={`/musteriler/${customer.id}`} className="text-sm text-bronze-600 underline">Aç</Link>}</div>
            {customer ? (
              <div className="space-y-1 text-sm">
                <div className="text-base font-semibold">{customer.ad}</div>
                {customer.telefon && <a href={`tel:${customer.telefon}`} className="block text-navy-600 underline">{customer.telefon}</a>}
                {customer.eposta && <a href={`mailto:${customer.eposta}`} className="block text-navy-600 underline">{customer.eposta}</a>}
                {customer.adres && <div className="text-navy-500">{customer.adres}</div>}
              </div>
            ) : <div className="text-sm text-navy-400">Müşteri bulunamadı</div>}
            <div className="mt-5 border-t border-navy-100 pt-4">
              <h3 className="mb-2 font-bold text-navy-800">Sıradaki adım</h3>
              <p className="text-sm text-navy-600">
                {project.durum === "kesif" && "Keşfi yapın, ölçüleri alın ve ön fiyat teklifini hazırlayın."}
                {project.durum === "teklif" && "Gönderilen teklifin onayını bekleyin; gerekirse revize açın."}
                {project.durum === "onayli" && "Kaporayı tahsil edin, malzemeleri teslim edin ve işe başlayın."}
                {project.durum === "uygulama" && "Ek işleri ve harcamaları kaydedin; iş bitince tutanak hazırlayın."}
                {project.durum === "teslim" && "Kalan bakiyeyi tahsil edip projeyi kapatın."}
                {(project.durum === "kapali" || project.durum === "iptal") && "Bu proje kapandı."}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "teklifler" && (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => yeniTeklif("on")}><Plus size={18} /> Ön fiyat teklifi</button>
            <button className="btn btn-primary" onClick={() => yeniTeklif("kesin")}><Plus size={18} /> Kesin fiyat teklifi</button>
          </div>
          {guncel.length === 0 ? <Empty title="Bu projede teklif yok" sub="Keşiften sonra ön veya kesin fiyat teklifi açın." /> : (
            <div className="card divide-y divide-navy-50">
              {guncel.map((q) => {
                const o = q.secenekler.find((s) => s.id === q.secilenSecenekId) ?? q.secenekler[0];
                const t = o && catalog ? calcOption(q, o, catalog).genelToplam : 0;
                const seriSayisi = quotes.filter((x) => x.rootId === q.rootId).length;
                return (
                  <Link key={q.id} href={`/teklifler/${q.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-navy-50">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText size={20} className="text-bronze-500" />
                      <div className="min-w-0"><div className="font-bold text-navy-800">{q.no} · {quoteTitle(q)}</div><div className="text-xs text-navy-400">{formatTarih(q.tarih)}{seriSayisi > 1 ? ` · ${seriSayisi} revize` : ""}{q.secenekler.length > 1 ? ` · ${q.secenekler.length} seçenek` : ""}</div></div>
                    </div>
                    <div className="flex items-center gap-3"><QuoteBadge durum={q.durum} /><span className="w-28 text-right font-bold">{formatTL(t)}</span></div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "odemeler" && <PaymentsTab ctx={ctx} />}
      {tab === "ekisler" && <ExtraJobsTab ctx={ctx} />}
      {tab === "teslim" && <DeliveriesTab ctx={ctx} />}
      {tab === "harcama" && <ExpensesTab ctx={ctx} />}
      {tab === "dosyalar" && <FilesTab ctx={ctx} />}
    </>
  );
}

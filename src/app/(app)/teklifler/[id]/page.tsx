"use client";

import { ArrowLeft, Check, Copy, FileDown, GitBranch, Plus, RotateCcw, Send, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { QuoteBadge } from "@/components/badges";
import { PromptModal } from "@/components/PromptModal";
import { QuoteBuilder, QuoteSettingsPanel, StringListEditor, SummaryPanel, cloneOptionAs } from "@/components/QuoteBuilder";
import { Badge, Loading, Modal, MoneyField, NumField, PageHeader, Tabs, TextInput, cx } from "@/components/ui";
import { approveQuote, deleteQuote, rejectQuote, reopenQuote, reviseQuote, sendQuote, updateQuote } from "@/lib/data/actions";
import { useCabinets, useCatalog, useCustomer, useLabor, useProducts, useProject, useProjectQuotes, useQuote, useTemplates } from "@/lib/data/hooks";
import { quoteTitle } from "@/lib/data/quote-ops";
import { calcOption } from "@/lib/engine/calc";
import { formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import { uid } from "@/lib/db/ids";
import type { Quote } from "@/lib/types";

function kalemAnahtarlari(q: Quote): Set<string> {
  const o = q.secenekler.find((x) => x.id === q.secilenSecenekId) ?? q.secenekler[0];
  const s = new Set<string>();
  for (const m of o?.mekanlar ?? []) for (const k of m.kalemler) if (k.aktif) s.add(`${m.ad} › ${k.ad}`);
  return s;
}

export default function QuotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const quote = useQuote(id);
  const products = useProducts();
  const labor = useLabor();
  const cabinets = useCabinets();
  const templates = useTemplates();
  const catalog = useCatalog();
  const project = useProject(quote?.projectId ?? "");
  const customer = useCustomer(quote?.customerId ?? "");
  const siblings = useProjectQuotes(quote?.projectId ?? "");
  const [optionId, setOptionId] = useState<string>("");
  const [presentation, setPresentation] = useState(false);
  const [approve, setApprove] = useState(false);
  const [secim, setSecim] = useState("");
  const [tab, setTab] = useState<"kapsam" | "metinler" | "revizeler">("kapsam");
  const [promptAcik, setPromptAcik] = useState(false);

  const seri = useMemo(() => (siblings && quote ? siblings.filter((s) => s.rootId === quote.rootId).sort((a, b) => a.revNo - b.revNo) : []), [siblings, quote]);

  if (!quote || !products || !labor || !templates || !catalog || !cabinets) return <Loading />;
  const readOnly = quote.durum !== "taslak";
  const aktifOpt = quote.secenekler.find((o) => o.id === optionId) ?? quote.secenekler[0];
  const edit = (fn: (q: Quote) => void) => updateQuote(quote.id, fn);
  const results = quote.secenekler.map((o) => calcOption(quote, o, catalog));

  function uyarilar(): string[] {
    const u: string[] = [];
    const aktifMekan = quote!.secenekler.every((o) => o.mekanlar.length > 0);
    if (!aktifMekan) u.push("Bazı seçeneklerde hiç mekan yok.");
    results.forEach((r, i) => {
      if (r.eksikFiyat > 0) u.push(`"${quote!.secenekler[i].ad}" seçeneğinde ${r.eksikFiyat} satırda fiyat/yevmiye girilmemiş.`);
      if (r.net <= 0) u.push(`"${quote!.secenekler[i].ad}" seçeneğinin toplamı 0.`);
      if (r.kar < 0) u.push(`"${quote!.secenekler[i].ad}" seçeneği zararına (kâr ${formatTL(r.kar)}).`);
    });
    if (quote!.iseBaslama && quote!.iseBaslama < quote!.tarih) u.push("İşe başlama tarihi teklif tarihinden önce.");
    const toplamYuzde = quote!.odemePlani.reduce((a, p) => a + p.yuzde, 0);
    if (quote!.odemePlani.length > 0 && Math.round(toplamYuzde) !== 100) u.push(`Ödeme planı %${toplamYuzde} (100 olmalı).`);
    return u;
  }

  async function gonder() {
    const u = uyarilar();
    const msg = (u.length ? `Dikkat:\n- ${u.join("\n- ")}\n\n` : "") + "Teklif 'Gönderildi' yapılacak. Fiyatlar dondurulur ve teklif düzenlemeye kapanır (değişiklik için revize açılır). Devam edilsin mi?";
    if (!confirm(msg)) return;
    await sendQuote(quote!.id);
  }

  async function revize(kesine = false) {
    const nid = await reviseQuote(quote!.id, kesine);
    if (nid) router.push(`/teklifler/${nid}`);
  }

  async function onayla() {
    if (!secim) return;
    await approveQuote(quote!.id, secim);
    setApprove(false);
  }

  const toplamYuzde = quote.odemePlani.reduce((a, p) => a + p.yuzde, 0);
  const sonSeri = seri[seri.length - 1];

  return (
    <>
      <PageHeader
        back={<Link href={`/projeler/${quote.projectId}`} className="mb-1 inline-flex items-center gap-1 text-sm text-navy-500"><ArrowLeft size={14} /> {customer?.ad ?? "Proje"} · {project?.ad ?? ""}</Link>}
        title={`${quote.no} · ${quoteTitle(quote)}`}
        sub={<span className="inline-flex flex-wrap items-center gap-2"><QuoteBadge durum={quote.durum} /> <span>{formatTarih(quote.tarih)}</span>{quote.dondurulmus && <Badge tone="bronze">Fiyatlar donduruldu</Badge>}</span>}
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setPromptAcik(true)}><Sparkles size={18} /> Görsel prompt</button>
            <Link href={`/teklifler/${quote.id}/yazdir`} className="btn btn-ghost"><FileDown size={18} /> PDF / Yazdır</Link>
            {quote.durum === "taslak" && <button className="btn btn-primary" onClick={gonder}><Send size={18} /> Gönderildi yap</button>}
            {quote.durum === "gonderildi" && (
              <>
                <button className="btn btn-accent" onClick={() => { setSecim(quote.secenekler.length === 1 ? quote.secenekler[0].id : ""); setApprove(true); }}><Check size={18} /> Onaylandı</button>
                <button className="btn btn-ghost" onClick={() => revize(false)}><GitBranch size={18} /> Revize</button>
                {quote.tur === "on" && <button className="btn btn-ghost" onClick={() => revize(true)}>Kesin teklife çevir</button>}
                <button className="btn btn-danger" onClick={() => confirm("Teklif reddedildi olarak işaretlensin mi?") && rejectQuote(quote.id)}><X size={18} /> Reddedildi</button>
                <button className="btn btn-ghost btn-sm" onClick={() => confirm("Taslağa dönülürse dondurulan fiyatlar silinir. Emin misiniz?") && reopenQuote(quote.id)}><RotateCcw size={16} /> Taslağa al</button>
              </>
            )}
            {quote.durum === "reddedildi" && <button className="btn btn-primary" onClick={() => revize(false)}><GitBranch size={18} /> Revize oluştur</button>}
            {quote.durum === "yerineGecti" && sonSeri && sonSeri.id !== quote.id && <Link href={`/teklifler/${sonSeri.id}`} className="btn btn-ghost">Güncel revizeye git →</Link>}
            {quote.durum === "taslak" && (
              <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm("Taslak silinsin mi?")) { await deleteQuote(quote.id); router.push(`/projeler/${quote.projectId}`); } }}><Trash2 size={16} /></button>
            )}
          </>
        }
      />

      {readOnly && (
        <div className="mb-4 rounded-xl border border-navy-200 bg-white p-3 text-sm text-navy-600">
          Bu teklif {quote.durum === "taslak" ? "" : "kilitli"}. Değişiklik için <b>Revize</b> oluşturun{quote.durum === "onaylandi" ? "; onaylı işe ekleme yapılacaksa projede Ek İş açın" : ""}.
        </div>
      )}

      <Tabs value={tab} onChange={setTab} tabs={[{ value: "kapsam", label: "Kapsam ve fiyat" }, { value: "metinler", label: "Notlar, şartlar, ödeme" }, { value: "revizeler", label: "Revize geçmişi", count: seri.length > 1 ? seri.length : 0 }]} />

      {tab === "kapsam" && (
        <div className="space-y-4">
          <QuoteSettingsPanel quote={quote} giderler={Object.entries(catalog.giderler ?? {}).map(([id, g]) => ({ id, ad: g.ad }))} />

          {/* Seçenekler */}
          <div className="flex flex-wrap items-center gap-2">
            {quote.secenekler.map((o, i) => (
              <button key={o.id} onClick={() => setOptionId(o.id)} className={cx("min-h-[44px] rounded-xl px-4 text-sm font-semibold", o.id === aktifOpt.id ? "bg-navy-800 text-white" : "bg-white text-navy-600 hover:bg-navy-100")}>
                {o.ad} <span className="ml-1 opacity-70">{formatTL(results[i].genelToplam)}</span>
                {quote.secilenSecenekId === o.id && <span className="ml-1">✓</span>}
              </button>
            ))}
            {!readOnly && (
              <button className="btn btn-ghost" onClick={() => { const yeni = cloneOptionAs(aktifOpt, `Seçenek ${quote.secenekler.length + 1}`); edit((q) => q.secenekler.push(yeni)); setOptionId(yeni.id); }}>
                <Copy size={16} /> Bu seçeneği kopyala (paket ekle)
              </button>
            )}
          </div>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-navy-500">Seçenek adı</span>
              <div className="w-56"><TextInput value={aktifOpt.ad} onChange={(v) => edit((q) => { const o = q.secenekler.find((x) => x.id === aktifOpt.id); if (o) o.ad = v; })} /></div>
              {quote.secenekler.length > 1 && (
                <button className="btn btn-danger btn-sm" onClick={() => confirm(`"${aktifOpt.ad}" seçeneği silinsin mi?`) && (edit((q) => (q.secenekler = q.secenekler.filter((x) => x.id !== aktifOpt.id))), setOptionId(""))}><Trash2 size={14} /> Seçeneği sil</button>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <QuoteBuilder quote={quote} products={products} cabinets={cabinets} labor={labor} templates={templates} catalog={catalog} optionId={aktifOpt.id} presentation={presentation} />
            <aside><SummaryPanel quote={quote} catalog={catalog} optionId={aktifOpt.id} presentation={presentation} onTogglePresentation={() => setPresentation(!presentation)} /></aside>
          </div>
        </div>
      )}

      {tab === "metinler" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StringListEditor title="Önemli notlar" hint="{gecerlilik} {iseBaslama} {teslim} yer tutucuları kullanılabilir. Tarih girilmemişse o maddeler PDF'e yazılmaz." readOnly={readOnly} items={quote.notlar} onChange={(items) => edit((q) => (q.notlar = items))} />
          <StringListEditor title="Genel şartlar" readOnly={readOnly} items={quote.sartlar} onChange={(items) => edit((q) => (q.sartlar = items))} />
          <div className="card space-y-3 p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-navy-800">Ödeme planı</div>
              <Badge tone={Math.round(toplamYuzde) === 100 ? "green" : "red"}>Toplam %{toplamYuzde}</Badge>
            </div>
            {quote.odemePlani.map((p) => (
              <div key={p.id} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                <TextInput disabled={readOnly} value={p.ad} onChange={(v) => edit((q) => { const x = q.odemePlani.find((y) => y.id === p.id); if (x) x.ad = v; })} />
                <NumField disabled={readOnly} suffix="%" value={p.yuzde} onChange={(v) => edit((q) => { const x = q.odemePlani.find((y) => y.id === p.id); if (x) x.yuzde = v ?? 0; })} />
                {!readOnly && <button className="btn btn-ghost btn-sm text-red-600" onClick={() => edit((q) => (q.odemePlani = q.odemePlani.filter((y) => y.id !== p.id)))}><Trash2 size={16} /></button>}
              </div>
            ))}
            {!readOnly && <button className="btn btn-ghost btn-sm" onClick={() => edit((q) => q.odemePlani.push({ id: uid(), ad: "Ödeme", yuzde: 0 }))}><Plus size={16} /> Aşama ekle</button>}
          </div>
        </div>
      )}

      {tab === "revizeler" && (
        <div className="space-y-3">
          {seri.length <= 1 && <div className="card p-6 text-center text-sm text-navy-500">Bu teklifin henüz revizesi yok.</div>}
          {seri.map((s, i) => {
            const opt = s.secenekler.find((o) => o.id === s.secilenSecenekId) ?? s.secenekler[0];
            const tot = opt ? calcOption(s, opt, catalog).genelToplam : 0;
            const prev = seri[i - 1];
            const prevOpt = prev ? (prev.secenekler.find((o) => o.id === prev.secilenSecenekId) ?? prev.secenekler[0]) : undefined;
            const prevTot = prev && prevOpt ? calcOption(prev, prevOpt, catalog).genelToplam : undefined;
            const now = kalemAnahtarlari(s);
            const before = prev ? kalemAnahtarlari(prev) : new Set<string>();
            const eklenen = prev ? Array.from(now).filter((x) => !before.has(x)) : [];
            const cikan = prev ? Array.from(before).filter((x) => !now.has(x)) : [];
            return (
              <Link key={s.id} href={`/teklifler/${s.id}`} className={cx("card block p-4 hover:border-navy-300", s.id === quote.id && "!border-bronze-400")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-navy-800">{s.no} · {quoteTitle(s)} <span className="font-normal text-navy-400">· {formatTarih(s.tarih)}</span></div>
                  <div className="flex items-center gap-2"><QuoteBadge durum={s.durum} /><span className="font-bold">{formatTL(tot)}</span>{prevTot != null && tot !== prevTot && <span className={cx("text-sm font-semibold", tot > prevTot ? "text-red-600" : "text-emerald-600")}>{tot > prevTot ? "+" : "−"}{formatTL(Math.abs(tot - prevTot))}</span>}</div>
                </div>
                {prev && (eklenen.length > 0 || cikan.length > 0) && (
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    {eklenen.length > 0 && <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800"><b>Eklenen:</b> {eklenen.join(" · ")}</div>}
                    {cikan.length > 0 && <div className="rounded-lg bg-red-50 p-2 text-red-800"><b>Çıkan:</b> {cikan.join(" · ")}</div>}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {promptAcik && <PromptModal mekanlar={aktifOpt.mekanlar} products={products} cabinets={cabinets} onClose={() => setPromptAcik(false)} />}

      {approve && (
        <Modal title="Teklifi onayla" onClose={() => setApprove(false)} footer={<><button className="btn btn-ghost" onClick={() => setApprove(false)}>Vazgeç</button><button className="btn btn-accent" disabled={!secim} onClick={onayla}>Onayla ve projeye bağla</button></>}>
          <p className="mb-3 text-sm text-navy-600">Müşterinin kabul ettiği seçeneği seçin. Sözleşme bedeli bu seçeneğin toplamı olur, proje "Onaylandı" aşamasına geçer.</p>
          <div className="space-y-2">
            {quote.secenekler.map((o, i) => (
              <button key={o.id} onClick={() => setSecim(o.id)} className={cx("flex w-full items-center justify-between rounded-xl border p-3 text-left", secim === o.id ? "border-bronze-500 bg-bronze-50" : "border-navy-100")}>
                <span className="font-semibold">{o.ad}</span><span className="font-bold">{formatTL(results[i].genelToplam)}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

"use client";

import { AlertTriangle, CalendarDays, FileText, FolderKanban, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { QuoteBadge } from "@/components/badges";
import { Loading, PageHeader, Stat } from "@/components/ui";
import { useAllExtraJobs, useAllPayments, useCatalog, useCustomers, useEvents, useLabor, useProducts, useProjects, useQuotes, useSettings } from "@/lib/data/hooks";
import { todayIso } from "@/lib/db/ids";
import { calcOption } from "@/lib/engine/calc";
import { formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";

export default function Dashboard() {
  const quotes = useQuotes();
  const projects = useProjects();
  const customers = useCustomers();
  const payments = useAllPayments();
  const extras = useAllExtraJobs();
  const events = useEvents();
  const labor = useLabor();
  const products = useProducts();
  const settings = useSettings();
  const catalog = useCatalog();

  const data = useMemo(() => {
    if (!quotes || !projects || !payments || !extras || !catalog) return null;
    const bugun = todayIso();
    let alacak = 0;
    for (const p of projects) {
      if (p.durum === "kapali" || p.durum === "iptal") continue;
      const q = quotes.find((x) => x.id === p.onayliQuoteId);
      if (!q) continue;
      const o = q.secenekler.find((s) => s.id === q.secilenSecenekId) ?? q.secenekler[0];
      const toplam = calcOption(q, o, catalog).genelToplam + extras.filter((e) => e.projectId === p.id && e.durum === "onaylandi").reduce((a, e) => a + e.tutar, 0);
      alacak += toplam - payments.filter((x) => x.projectId === p.id).reduce((a, x) => a + x.tutar, 0);
    }
    const bekleyen = quotes.filter((q) => q.durum === "gonderildi").map((q) => {
      const o = q.secenekler.find((s) => s.id === q.secilenSecenekId) ?? q.secenekler[0];
      const gun = Math.floor((Date.now() - new Date(q.guncellendi).getTime()) / 86400000);
      return { q, toplam: calcOption(q, o, catalog).genelToplam, gun };
    });
    const taslaklar = quotes.filter((q) => q.durum === "taslak");
    return { alacak, bekleyen, taslaklar, bugun };
  }, [quotes, projects, payments, extras, catalog]);

  if (!data || !customers || !events || !labor || !products || !settings) return <Loading />;
  const yaklasan = events.filter((e) => !e.tamam && e.tarih >= data.bugun).slice(0, 6);
  const gecmis = events.filter((e) => !e.tamam && e.tarih < data.bugun);
  const aktifProje = (projects ?? []).filter((p) => p.durum !== "kapali" && p.durum !== "iptal").length;
  const eksikYevmiye = labor.filter((l) => l.aktif && l.yevmiye <= 0).length;
  const bosListe = products.length === 0;

  return (
    <>
      <PageHeader title="Panel" sub={new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />

      {(bosListe || eksikYevmiye > 0) && (
        <Link href="/fiyatlar" className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Teklif hesabı için fiyatları girin</div>
            <div>{bosListe ? "Fiyat listesinde henüz ürün yok. " : ""}{eksikYevmiye > 0 ? `${eksikYevmiye} usta türünün yevmiyesi girilmemiş. ` : ""}Hesaplama bu değerlerden çalışır; eksik fiyatlar teklifte uyarı olarak görünür. İsterseniz Ayarlar'dan örnek verilerle deneyin.</div>
          </div>
        </Link>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aktif proje" value={aktifProje} sub={`${customers.length} müşteri`} />
        <Stat label="Onay bekleyen teklif" value={data.bekleyen.length} sub={data.bekleyen.length ? `${formatTL(data.bekleyen.reduce((a, b) => a + b.toplam, 0))} değerinde` : "—"} />
        <Stat label="Taslak teklif" value={data.taslaklar.length} />
        <Stat label="Tahsil edilecek" value={formatTL(Math.max(0, data.alacak))} sub="Onaylı projelerde kalan bakiye" tone={data.alacak > 0 ? "warn" : "default"} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/musteriler" className="btn btn-primary"><Users size={18} /> Müşteri ekle</Link>
        <Link href="/projeler" className="btn btn-ghost"><FolderKanban size={18} /> Projeler</Link>
        <Link href="/teklifler" className="btn btn-ghost"><FileText size={18} /> Teklifler</Link>
        <Link href="/takvim" className="btn btn-ghost"><CalendarDays size={18} /> Takvim</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 font-bold text-navy-800">Takip edilecek teklifler</h2>
          {data.bekleyen.length === 0 ? <div className="py-6 text-center text-sm text-navy-400">Cevap bekleyen teklif yok</div> : (
            <div className="divide-y divide-navy-50">
              {data.bekleyen.sort((a, b) => b.gun - a.gun).map(({ q, toplam, gun }) => (
                <Link key={q.id} href={`/teklifler/${q.id}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-navy-800">{q.no} · {customers.find((c) => c.id === q.customerId)?.ad}</div>
                    <div className="text-xs text-navy-400">{gun === 0 ? "Bugün gönderildi" : `${gun} gündür cevap yok`}{gun >= q.gecerlilikGun ? " · geçerlilik süresi doldu" : ""}</div>
                  </div>
                  <div className="text-right"><QuoteBadge durum={q.durum} /><div className="mt-1 text-sm font-bold">{formatTL(toplam)}</div></div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-2 font-bold text-navy-800">Yaklaşan işler</h2>
          {gecmis.length > 0 && <Link href="/takvim" className="mb-2 block rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{gecmis.length} gecikmiş hatırlatma var</Link>}
          {yaklasan.length === 0 ? <div className="py-6 text-center text-sm text-navy-400">Planlanmış iş yok</div> : (
            <div className="divide-y divide-navy-50">
              {yaklasan.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><div className="truncate font-semibold text-navy-800">{e.baslik}</div><div className="text-xs text-navy-400">{formatTarih(e.tarih)}{e.saat ? ` · ${e.saat}` : ""}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {data.taslaklar.length > 0 && (
          <div className="card p-4 lg:col-span-2">
            <h2 className="mb-2 font-bold text-navy-800">Taslaklar</h2>
            <div className="divide-y divide-navy-50">
              {data.taslaklar.slice(0, 5).map((q) => (
                <Link key={q.id} href={`/teklifler/${q.id}`} className="flex items-center justify-between py-3"><span className="font-semibold text-navy-800">{q.no} · {customers.find((c) => c.id === q.customerId)?.ad}</span><span className="text-xs text-navy-400">{formatTarih(q.guncellendi)}</span></Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

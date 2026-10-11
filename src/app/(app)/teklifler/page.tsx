"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { QuoteBadge } from "@/components/badges";
import { Empty, Loading, PageHeader, Tabs } from "@/components/ui";
import { useCatalog, useCustomers, useProjects, useQuotes } from "@/lib/data/hooks";
import { quoteTitle } from "@/lib/data/quote-ops";
import { calcOption } from "@/lib/engine/calc";
import { formatTL } from "@/lib/engine/money";
import { formatTarih } from "@/lib/engine/text";
import type { QuoteDurum } from "@/lib/types";

export default function QuotesPage() {
  const quotes = useQuotes();
  const customers = useCustomers();
  const projects = useProjects();
  const catalog = useCatalog();
  const [f, setF] = useState<"hepsi" | QuoteDurum>("hepsi");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!quotes || !customers || !projects || !catalog) return [];
    return quotes
      .filter((x) => (f === "hepsi" ? x.durum !== "yerineGecti" : x.durum === f))
      .map((x) => {
        const o = x.secenekler.find((s) => s.id === x.secilenSecenekId) ?? x.secenekler[0];
        const toplam = o ? calcOption(x, o, catalog).genelToplam : 0;
        return { x, toplam, musteri: customers.find((c) => c.id === x.customerId)?.ad ?? "—", proje: projects.find((p) => p.id === x.projectId)?.ad ?? "—" };
      })
      .filter((r) => `${r.x.no} ${r.musteri} ${r.proje}`.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));
  }, [quotes, customers, projects, catalog, f, q]);

  if (!quotes || !catalog) return <Loading />;

  return (
    <>
      <PageHeader title="Teklifler" sub="Yeni teklif, ilgili müşterinin projesinden açılır" />
      <Tabs
        value={f}
        onChange={setF}
        tabs={[
          { value: "hepsi", label: "Güncel" },
          { value: "taslak", label: "Taslak" },
          { value: "gonderildi", label: "Gönderildi" },
          { value: "onaylandi", label: "Onaylandı" },
          { value: "reddedildi", label: "Reddedildi" },
          { value: "yerineGecti", label: "Eski revizeler" },
        ]}
      />
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className="input pl-10" placeholder="Teklif no, müşteri veya proje ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {rows.length === 0 ? (
        <Empty title="Teklif yok" sub="Önce bir müşteri ve proje oluşturun, teklifi proje sayfasından açın." action={<Link href="/projeler" className="btn btn-primary">Projelere git</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-navy-100 bg-navy-50"><tr><th className="th">No</th><th className="th">Müşteri / proje</th><th className="th">Tür</th><th className="th">Tarih</th><th className="th">Durum</th><th className="th text-right">Toplam</th></tr></thead>
              <tbody className="divide-y divide-navy-50">
                {rows.map(({ x, toplam, musteri, proje }) => (
                  <tr key={x.id} className="hover:bg-navy-50">
                    <td className="td font-bold"><Link href={`/teklifler/${x.id}`} className="text-navy-800 underline-offset-2 hover:underline">{x.no}</Link></td>
                    <td className="td"><div className="font-semibold text-navy-800">{musteri}</div><div className="text-xs text-navy-400">{proje}</div></td>
                    <td className="td text-navy-600">{quoteTitle(x)}</td>
                    <td className="td text-navy-600">{formatTarih(x.tarih)}</td>
                    <td className="td"><QuoteBadge durum={x.durum} /></td>
                    <td className="td text-right font-bold">{formatTL(toplam)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

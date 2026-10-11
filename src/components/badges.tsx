import { DURUM_ETIKET, PROJE_DURUM_ETIKET, type ProjeDurum, type QuoteDurum } from "@/lib/types";
import { Badge } from "./ui";

export function QuoteBadge({ durum }: { durum: QuoteDurum }) {
  const tone = { taslak: "gray", gonderildi: "blue", onaylandi: "green", reddedildi: "red", yerineGecti: "amber" } as const;
  return <Badge tone={tone[durum]}>{DURUM_ETIKET[durum]}</Badge>;
}

export function ProjectBadge({ durum }: { durum: ProjeDurum }) {
  const tone = { kesif: "gray", teklif: "blue", onayli: "bronze", uygulama: "amber", teslim: "green", kapali: "gray", iptal: "red" } as const;
  return <Badge tone={tone[durum]}>{PROJE_DURUM_ETIKET[durum]}</Badge>;
}

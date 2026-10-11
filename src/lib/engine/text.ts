import type { Mekan, QuoteItem } from "../types";
import type { Catalog } from "./calc";
import { olculer } from "./calc";
import { formatSayi } from "./money";

/** m² gibi değerleri müşteri metninde "yaklaşık 42" biçiminde sadeleştirir. */
function yaklasik(n: number): string {
  return Number.isInteger(n) ? String(n) : formatSayi(Math.round(n * 10) / 10, 1);
}

/**
 * Müşteriye görünen cümledeki yer tutucuları doldurur.
 * {zemin} {duvar} {toplam} {tavan} {urun} {marka}
 */
export function renderItemText(item: QuoteItem, mekan: Mekan, cat: Catalog): string {
  const o = olculer(mekan);
  const secili = item.satirlar.filter((l) => l.kind === "malzeme" && l.metindeGoster && l.productId && cat.urunler[l.productId]);
  const urunler = Array.from(new Set(secili.map((l) => cat.urunler[l.productId as string].ad)));
  const markalar = Array.from(new Set(secili.map((l) => cat.urunler[l.productId as string].tedarikci ?? "").filter(Boolean)));
  const map: Record<string, string> = {
    zemin: yaklasik(o.zemin),
    duvar: yaklasik(o.duvar),
    toplam: yaklasik(o.toplam),
    tavan: yaklasik(o.tavan),
    urun: urunler.join(", "),
    marka: markalar.join(", "),
  };
  let out = item.metin.replace(/\{(zemin|duvar|toplam|tavan|urun|marka)\}/g, (_, k: string) => map[k] ?? "");
  // Boş kalan yer tutucudan doğan "()" ve çift boşlukları temizle
  out = out.replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
  return out;
}

/** Notlar/şartlardaki {gecerlilik} {iseBaslama} {teslim} yer tutucularını doldurur. */
export function renderSablon(
  metin: string,
  v: { gecerlilik: number; iseBaslama?: string; teslim?: number },
): string {
  return metin
    .replace(/\{gecerlilik\}/g, String(v.gecerlilik))
    .replace(/\{iseBaslama\}/g, v.iseBaslama ? formatTarihUzun(v.iseBaslama) : "—")
    .replace(/\{teslim\}/g, v.teslim != null ? String(v.teslim) : "—");
}

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** 2026-10-05 -> "5 Ekim 2026" */
export function formatTarihUzun(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${AYLAR[m - 1]} ${y}`;
}

/** 2026-10-05 -> "05.10.2026" */
export function formatTarih(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

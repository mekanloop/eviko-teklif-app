import type { Kurus } from "../types";

/** Sayıyı (TL) kuruşa çevirir; gürültüyü yuvarlar. */
export function tlToKurus(tl: number): Kurus {
  if (!Number.isFinite(tl)) return 0;
  return Math.round(tl * 100);
}

export function kurusToTl(k: Kurus): number {
  return k / 100;
}

const nf0 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 58900000 -> "589.000 ₺", 12345 -> "123,45 ₺" */
export function formatTL(k: Kurus, opts: { sembol?: boolean } = {}): string {
  const sembol = opts.sembol ?? true;
  const whole = k % 100 === 0;
  const s = whole ? nf0.format(k / 100) : nf2.format(k / 100);
  return sembol ? `${s} ₺` : s;
}

/** "1.250,50" / "1250.5" / "1250" -> kuruş. Geçersizse null. */
export function parseTL(input: string): Kurus | null {
  const n = parseSayi(input);
  return n === null ? null : tlToKurus(n);
}

/** Türkçe veya düz sayı yazımını sayıya çevirir. */
export function parseSayi(input: string): number | null {
  let s = input.trim().replace(/\s|₺|TL/gi, "");
  if (s === "") return null;
  const virgul = s.lastIndexOf(",");
  const nokta = s.lastIndexOf(".");
  if (virgul >= 0 && nokta >= 0) {
    // son ayraç ondalıktır
    if (virgul > nokta) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (virgul >= 0) {
    s = s.replace(",", ".");
  } else if (nokta >= 0) {
    // 1.250 (binlik) mi 1.5 (ondalık) mı: noktadan sonra tam 3 hane ve tek nokta ise binlik kabul et
    const parts = s.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1 && /^\d+$/.test(parts[0]))) {
      s = parts.join("");
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatSayi(n: number, maxHane = 2): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: maxHane }).format(n);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Yüzde oranını kuruş üzerine uygular: cost * (1 + pct/100), tam sayı hassasiyetiyle. */
export function withMarkup(cost: Kurus, pct: number): Kurus {
  const bp = Math.round(pct * 100); // baz puan
  return Math.round((cost * (10000 + bp)) / 10000);
}

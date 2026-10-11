import type { DuvarYonu, Mekan, PlanAcilim, PlanOge, PlanOgeTuru } from "../types";

/** Yeni eklenen öğelerin varsayılan boyutları (cm). w = yatay, h = dikey (döndürmeden önce). */
export const OGE_VARSAYILAN: Record<PlanOgeTuru, { ad: string; w: number; h: number }> = {
  klozet: { ad: "Klozet", w: 40, h: 70 },
  lavabo: { ad: "Lavabo", w: 60, h: 45 },
  dusakabin: { ad: "Duşakabin", w: 90, h: 90 },
  kuvet: { ad: "Küvet", w: 170, h: 70 },
  camasir: { ad: "Çamaşır makinesi", w: 60, h: 60 },
  havlu: { ad: "Havluluk", w: 50, h: 12 },
  dolap: { ad: "Dolap", w: 60, h: 45 },
  diger: { ad: "Öğe", w: 50, h: 50 },
};

export const SNAP_CM = 5;

export function odaCm(m: Pick<Mekan, "en" | "boy">): { W: number; H: number } {
  return { W: Math.max(0, Math.round((m.en || 0) * 100)), H: Math.max(0, Math.round((m.boy || 0) * 100)) };
}

/** Döndürmeden sonra planda kapladığı genişlik/yükseklik */
export function ogeBoyut(o: Pick<PlanOge, "w" | "h" | "rot">): { w: number; h: number } {
  return o.rot === 90 || o.rot === 270 ? { w: o.h, h: o.w } : { w: o.w, h: o.h };
}

export function snap(v: number, adim = SNAP_CM): number {
  return Math.round(v / adim) * adim;
}

/** Öğeyi oda sınırları içinde tutar */
export function clampOge<T extends Pick<PlanOge, "x" | "y" | "w" | "h" | "rot">>(o: T, W: number, H: number): T {
  const b = ogeBoyut(o);
  const x = Math.min(Math.max(0, o.x), Math.max(0, W - b.w));
  const y = Math.min(Math.max(0, o.y), Math.max(0, H - b.h));
  return { ...o, x, y };
}

export function yeniOge(tur: PlanOgeTuru, W: number, H: number, uidFn: () => string, ek?: Partial<PlanOge>): PlanOge {
  const v = OGE_VARSAYILAN[tur];
  const o: PlanOge = { id: uidFn(), tur, ad: v.ad, x: 0, y: 0, w: v.w, h: v.h, rot: 0, ...ek };
  const b = ogeBoyut(o);
  return clampOge({ ...o, x: snap((W - b.w) / 2), y: snap((H - b.h) / 2) }, W, H);
}

/** Açılımın (kapı/pencere) duvar üzerindeki başlangıç ve bitiş noktaları (cm) */
export function acilimSegment(a: PlanAcilim, W: number, H: number): { x1: number; y1: number; x2: number; y2: number } {
  switch (a.duvar) {
    case "ust": return { x1: a.ofset, y1: 0, x2: a.ofset + a.genislik, y2: 0 };
    case "alt": return { x1: a.ofset, y1: H, x2: a.ofset + a.genislik, y2: H };
    case "sol": return { x1: 0, y1: a.ofset, x2: 0, y2: a.ofset + a.genislik };
    default: return { x1: W, y1: a.ofset, x2: W, y2: a.ofset + a.genislik };
  }
}

const DUVAR_EN: Record<DuvarYonu, string> = { ust: "north", sag: "east", alt: "south", sol: "west" };
const DUVAR_TR: Record<DuvarYonu, string> = { ust: "üst (kuzey)", sag: "sağ (doğu)", alt: "alt (güney)", sol: "sol (batı)" };
export const duvarAdi = (d: DuvarYonu, dil: "en" | "tr") => (dil === "en" ? DUVAR_EN[d] : DUVAR_TR[d]);

/** Öğenin en yakın duvarı, duvara boşluğu ve duvar boyunca konumu */
export function enYakinDuvar(o: PlanOge, W: number, H: number): { duvar: DuvarYonu; bosluk: number; boyunca: number; kenar: DuvarYonu } {
  const b = ogeBoyut(o);
  const gaps: Array<[DuvarYonu, number]> = [
    ["sol", o.x],
    ["sag", W - (o.x + b.w)],
    ["ust", o.y],
    ["alt", H - (o.y + b.h)],
  ];
  gaps.sort((a, c) => a[1] - c[1]);
  const [duvar, bosluk] = gaps[0];
  if (duvar === "ust" || duvar === "alt") return { duvar, bosluk, boyunca: o.x, kenar: "sol" };
  return { duvar, bosluk, boyunca: o.y, kenar: "ust" };
}

export function acilimMetni(a: PlanAcilim, dil: "en" | "tr"): string {
  const tipEn = { kapi: "door (swings inward)", pencere: "window", surgulu: "sliding/pocket door" }[a.tip];
  const tipTr = { kapi: "kapı (içe açılır)", pencere: "pencere", surgulu: "sürgülü/gömme kapı" }[a.tip];
  const kenar = a.duvar === "ust" || a.duvar === "alt" ? "sol" : "ust";
  if (dil === "en") return `${tipEn} on the ${duvarAdi(a.duvar, "en")} wall, ${a.ofset} cm from the ${duvarAdi(kenar, "en")} corner, ${a.genislik} cm wide`;
  return `${tipTr}: ${duvarAdi(a.duvar, "tr")} duvarda, ${duvarAdi(kenar, "tr")} köşeden ${a.ofset} cm, ${a.genislik} cm genişlikte`;
}

const OGE_EN: Record<PlanOgeTuru, string> = {
  klozet: "toilet (WC)",
  lavabo: "washbasin",
  dusakabin: "shower enclosure",
  kuvet: "bathtub",
  camasir: "washing machine",
  havlu: "towel rail",
  dolap: "cabinet",
  diger: "item",
};

export function ogeMetni(o: PlanOge, W: number, H: number, dil: "en" | "tr", ekAd?: string): string {
  const b = ogeBoyut(o);
  const y = enYakinDuvar(o, W, H);
  const dim = y.duvar === "ust" || y.duvar === "alt" ? `${b.w} cm along the wall × ${b.h} cm deep` : `${b.h} cm along the wall × ${b.w} cm deep`;
  const dimTr = y.duvar === "ust" || y.duvar === "alt" ? `duvar boyunca ${b.w} cm × derinlik ${b.h} cm` : `duvar boyunca ${b.h} cm × derinlik ${b.w} cm`;
  const varsayilanAd = OGE_VARSAYILAN[o.tur].ad;
  const ad = ekAd ?? (dil === "en" ? `${OGE_EN[o.tur]}${o.ad && o.ad !== varsayilanAd ? ` (${o.ad})` : ""}` : o.ad);
  if (dil === "en") {
    return `${ad}: against the ${duvarAdi(y.duvar, "en")} wall (gap ${y.bosluk} cm), starting ${y.boyunca} cm from the ${duvarAdi(y.kenar, "en")} corner, ${dim}`;
  }
  return `${ad}: ${duvarAdi(y.duvar, "tr")} duvara dayalı (boşluk ${y.bosluk} cm), ${duvarAdi(y.kenar, "tr")} köşeden ${y.boyunca} cm, ${dimTr}`;
}

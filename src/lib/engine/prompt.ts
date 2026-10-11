import type { Cabinet, Mekan, Product } from "../types";
import { MEKAN_ETIKET, type MekanTuru } from "../types";
import { olculer } from "./calc";
import { acilimMetni, odaCm, ogeMetni } from "./plan";

export type PromptDili = "en" | "tr";

export interface PromptGirdi {
  mekan: Mekan;
  urunler: Record<string, Product>;
  dolapKatalogu: Record<string, Cabinet>;
  dil: PromptDili;
  /** Serbest stil notları (ışık, kamera, atmosfer) */
  stil: string;
}

export const VARSAYILAN_STIL: Record<PromptDili, string> = {
  en: "Photorealistic interior photograph, modern Turkish apartment bathroom, soft natural daylight plus warm LED spots, 24mm wide lens, high detail, realistic grout lines and reflections, no people, no text, no watermark.",
  tr: "Fotogerçekçi iç mekan fotoğrafı, modern Türk apartman dairesi banyosu, yumuşak gün ışığı ve sıcak LED spot, 24mm geniş açı lens, yüksek detay, gerçekçi derz çizgileri ve yansımalar, insan yok, yazı yok, filigran yok.",
};

const MEKAN_EN: Record<MekanTuru, string> = { banyo: "bathroom", wc: "WC / toilet room", mutfak: "kitchen", salon: "living room", oda: "room", genel: "room" };
const N = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

function urunTarifi(p: Product, dil: PromptDili): string {
  const parcalar = [p.tedarikci, p.ad, p.ebat && (dil === "en" ? `size ${p.ebat}` : `ebat ${p.ebat}`), p.renk && (dil === "en" ? `color ${p.renk}` : `renk ${p.renk}`), p.yuzey && (dil === "en" ? `${p.yuzey} finish` : `${p.yuzey} yüzey`)].filter(Boolean);
  return parcalar.join(", ");
}

export function malzemeSatirlari(g: PromptGirdi): string[] {
  const out: string[] = [];
  const goruldu = new Set<string>();
  for (const k of g.mekan.kalemler) {
    if (!k.aktif) continue;
    for (const l of k.satirlar) {
      if (l.kind !== "malzeme" || !l.metindeGoster || !l.productId) continue;
      const p = g.urunler[l.productId];
      if (!p) continue;
      const anahtar = `${l.label}|${p.id}`;
      if (goruldu.has(anahtar)) continue;
      goruldu.add(anahtar);
      out.push(`${l.label}: ${urunTarifi(p, g.dil)}`);
    }
  }
  return out;
}

export function dolapSatirlari(g: PromptGirdi): string[] {
  const { mekan, dil } = g;
  const { W, H } = odaCm(mekan);
  const out: string[] = [];
  for (const d of mekan.dolaplar ?? []) {
    if (!d.aktif) continue;
    const kat = d.cabinetId ? g.dolapKatalogu[d.cabinetId] : undefined;
    const model = kat ? kat.ad : d.ad;
    const olcu = `${d.genislik}×${d.yukseklik}×${d.derinlik} cm`;
    const oge = (mekan.ogeler ?? []).find((o) => o.dolapId === d.id);
    const yer = oge ? `; ${ogeMetni(oge, W, H, dil, "placement")}`.replace("placement: ", "") : "";
    if (dil === "en") out.push(`${d.ad} (model: ${model}), color: ${d.renk || "n/a"}, W×H×D ${olcu}${d.adet > 1 ? `, quantity ${d.adet}` : ""}${yer}`);
    else out.push(`${d.ad} (model: ${model}), renk: ${d.renk || "belirtilmedi"}, G×Y×D ${olcu}${d.adet > 1 ? `, adet ${d.adet}` : ""}${yer}`);
  }
  return out;
}

export function yerlesimSatirlari(g: PromptGirdi): string[] {
  const { mekan, dil } = g;
  const { W, H } = odaCm(mekan);
  const out: string[] = [];
  for (const a of mekan.acilimlar ?? []) out.push(acilimMetni(a, dil));
  for (const o of mekan.ogeler ?? []) {
    if (o.tur === "dolap" && o.dolapId) continue; // dolaplar ayrı listede
    out.push(ogeMetni(o, W, H, dil));
  }
  return out;
}

/** Bir mekan için ana şartname metni. Tüm açı promptlarının başına konur. */
export function masterSartname(g: PromptGirdi): string {
  const { mekan, dil } = g;
  const o = olculer(mekan);
  const tur = dil === "en" ? MEKAN_EN[mekan.tur] : MEKAN_ETIKET[mekan.tur];
  const malzeme = malzemeSatirlari(g);
  const yer = yerlesimSatirlari(g);
  const dolap = dolapSatirlari(g);
  const satir = (baslik: string, liste: string[], bos: string) => `${baslik}\n${liste.length ? liste.map((x) => `- ${x}`).join("\n") : `- ${bos}`}`;
  if (dil === "en") {
    return [
      `MASTER SPEC — keep every detail below identical in all images (dimensions, layout, materials, colors). Do not invent extra fixtures.`,
      ``,
      `ROOM: ${mekan.ad} (${tur}). Floor plan ${N(mekan.en)} m × ${N(mekan.boy)} m (${odaCm(mekan).W} × ${odaCm(mekan).H} cm), ceiling height ${N(mekan.yukseklik)} m. Floor ≈ ${N(o.zemin)} m², wall area ≈ ${N(o.duvar)} m².`,
      `PLAN ORIENTATION: top of the plan = north (far) wall, bottom = south, left = west, right = east. Positions are measured from the room's inside corners.`,
      ``,
      satir("OPENINGS AND FIXTURES:", yer, "none specified"),
      ``,
      satir("CABINETRY:", dolap, "none"),
      ``,
      satir("MATERIALS AND PRODUCTS:", malzeme, "not specified"),
    ].join("\n");
  }
  return [
    `ANA ŞARTNAME — aşağıdaki tüm ayrıntılar her görselde aynı kalsın (ölçüler, yerleşim, malzeme, renk). Fazladan eşya ekleme.`,
    ``,
    `MEKAN: ${mekan.ad} (${tur}). Plan ${N(mekan.en)} m × ${N(mekan.boy)} m (${odaCm(mekan).W} × ${odaCm(mekan).H} cm), tavan yüksekliği ${N(mekan.yukseklik)} m. Zemin ≈ ${N(o.zemin)} m², duvar alanı ≈ ${N(o.duvar)} m².`,
    `PLAN YÖNÜ: planın üstü = üst (kuzey, karşı) duvar, altı = alt (güney), solu = sol (batı), sağı = sağ (doğu). Konumlar odanın iç köşelerinden ölçülmüştür.`,
    ``,
    satir("AÇIKLIKLAR VE VİTRİFİYE/YERLEŞİM:", yer, "belirtilmedi"),
    ``,
    satir("DOLAPLAR:", dolap, "yok"),
    ``,
    satir("MALZEME VE ÜRÜNLER:", malzeme, "belirtilmedi"),
  ].join("\n");
}

export interface AciPrompt {
  baslik: string;
  prompt: string;
}

const ACILAR: Record<PromptDili, Array<{ baslik: string; kamera: string }>> = {
  en: [
    { baslik: "1 · Wide view from the door", kamera: "Camera stands at the door opening, eye height 150 cm, looking into the room, showing the whole space." },
    { baslik: "2 · From the far corner", kamera: "Camera in the corner opposite the door, 140 cm height, looking back toward the door wall." },
    { baslik: "3 · Sanitaryware wall", kamera: "Camera facing the wall with the toilet and washbasin, 130 cm height, slightly wide lens, straight-on." },
    { baslik: "4 · Shower area", kamera: "Camera facing the shower area, 130 cm height, showing glass, tiles and fittings clearly." },
    { baslik: "5 · Cabinet and tile close-up", kamera: "Closer shot of the cabinet and the surrounding tiles, 110 cm height, shallow depth of field, showing color and texture accurately." },
    { baslik: "6 · Top-down axonometric", kamera: "Isometric view from above at 45°, ceiling removed, showing the entire layout and all fixtures." },
  ],
  tr: [
    { baslik: "1 · Kapıdan geniş görünüm", kamera: "Kamera kapı açıklığında, göz hizası 150 cm, odaya bakıyor, tüm mekanı gösteriyor." },
    { baslik: "2 · Karşı köşeden", kamera: "Kamera kapının karşısındaki köşede, 140 cm yükseklikte, kapı duvarına doğru bakıyor." },
    { baslik: "3 · Vitrifiye duvarı", kamera: "Kamera klozet ve lavabonun olduğu duvara dik bakıyor, 130 cm yükseklik, hafif geniş açı." },
    { baslik: "4 · Duş alanı", kamera: "Kamera duş alanına bakıyor, 130 cm yükseklik; cam, seramik ve armatürler net görünüyor." },
    { baslik: "5 · Dolap ve seramik yakın çekim", kamera: "Dolaba ve çevresindeki seramiğe yakın çekim, 110 cm yükseklik, düşük alan derinliği; renk ve doku doğru görünmeli." },
    { baslik: "6 · Kuşbakışı izometrik", kamera: "45° yukarıdan izometrik görünüm, tavan yok, tüm yerleşim ve eşyalar görünüyor." },
  ],
};

/** Her açı için kopyala-yapıştır hazır, kendi içinde tam promptlar. */
export function aciPromptlari(g: PromptGirdi): AciPrompt[] {
  const master = masterSartname(g);
  const stil = g.stil.trim() || VARSAYILAN_STIL[g.dil];
  return ACILAR[g.dil].map((a) => ({
    baslik: a.baslik,
    prompt:
      g.dil === "en"
        ? `${master}\n\nSTYLE: ${stil}\n\nTHIS IMAGE — ${a.baslik}: ${a.kamera}\nUse the attached floor plan image (if provided) as the exact layout reference. Keep materials, colors and positions identical to the MASTER SPEC.`
        : `${master}\n\nSTİL: ${stil}\n\nBU GÖRSEL — ${a.baslik}: ${a.kamera}\nEkli kroki görselini (varsa) birebir yerleşim referansı olarak kullan. Malzeme, renk ve konumlar ANA ŞARTNAME ile aynı kalsın.`,
  }));
}

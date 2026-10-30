"use client";

import { parseTL } from "@/lib/engine/money";
import type { Kurus } from "@/lib/types";

export type MoneyCandidate = { tutar: Kurus; metin: string };

/** PDF metnindeki parasal ifadeleri bulur. Tutarı asla kendiliğinden teklife yazmaz. */
export async function extractMoneyCandidates(file: File): Promise<MoneyCandidate[]> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Lütfen PDF dosyası seçin.");
  }
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let text = "";
  for (let page = 1; page <= pdf.numPages; page++) {
    const content = await (await pdf.getPage(page)).getTextContent();
    text += "\n" + content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
  }
  const matches = text.matchAll(/(?:₺\s*)?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\s*(?:₺|TL)\b|(?:₺\s*)?\d+(?:[.,]\d{1,2})?\s*(?:₺|TL)\b/gi);
  const found = new Map<Kurus, MoneyCandidate>();
  for (const match of matches) {
    const tutar = parseTL(match[0]);
    if (tutar && tutar > 0) found.set(tutar, { tutar, metin: match[0].trim() });
  }
  return Array.from(found.values()).sort((a, b) => b.tutar - a.tutar).slice(0, 20);
}

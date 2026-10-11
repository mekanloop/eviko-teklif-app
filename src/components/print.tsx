"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Settings } from "@/lib/types";

export function PrintToolbar(props: { backHref: string; backLabel: string; hint?: string }) {
  return (
    <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-navy-200 bg-white/95 px-4 py-2 backdrop-blur safe-t">
      <Link href={props.backHref} className="btn btn-ghost btn-sm"><ArrowLeft size={16} /> {props.backLabel}</Link>
      <div className="hidden text-xs text-navy-500 sm:block">{props.hint ?? "iPad: Yazdır → sağ üstten paylaş simgesi ile PDF olarak kaydedin veya WhatsApp'tan gönderin"}</div>
      <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer size={16} /> Yazdır / PDF</button>
    </div>
  );
}

export function Letterhead(props: { settings: Settings; title: string; lines: string[] }) {
  const s = props.settings;
  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div>
          {s.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo} alt={s.firmaAd} style={{ maxHeight: 54, maxWidth: 220 }} />
          ) : (
            <div style={{ fontSize: "20pt", fontWeight: 800, letterSpacing: "0.06em", color: "#1b2a4a", lineHeight: 1.05 }}>{s.firmaAd}</div>
          )}
          <div style={{ fontSize: "8.5pt", color: "#6580ad", marginTop: 3 }}>{[s.web, s.adres].filter(Boolean).join("  |  ")}</div>
          {s.firmaAlt && <div style={{ fontSize: "8pt", letterSpacing: "0.12em", textTransform: "uppercase", color: "#b08d57", marginTop: 2 }}>{s.firmaAlt}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "14pt", fontWeight: 800, color: "#1b2a4a", letterSpacing: "0.03em" }}>{props.title}</div>
          {props.lines.map((l, i) => (
            <div key={i} style={{ fontSize: "9pt", color: "#44608f" }}>{l}</div>
          ))}
        </div>
      </div>
      <div className="rule" />
    </>
  );
}

export function InfoGrid({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", rowGap: 3, margin: "0 0 14px" }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <div style={{ fontSize: "9pt", color: "#6580ad", letterSpacing: "0.04em", textTransform: "uppercase" }}>{k}</div>
          <div style={{ fontWeight: 700 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

export function SheetFooter({ settings, right }: { settings: Settings; right?: string }) {
  return (
    <div className="sheet-foot">
      <span>{[settings.firmaAd, settings.web, settings.adres].filter(Boolean).join(" | ")}</span>
      <span>{right}</span>
    </div>
  );
}

export function SignatureBlocks(props: { left: string; right: string; rightImage?: string }) {
  return (
    <div className="keep" style={{ display: "flex", justifyContent: "space-between", gap: 40, marginTop: 28 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{props.left}</div>
        <div style={{ height: 70 }} />
        <div style={{ borderTop: "1px solid #94a8c8", paddingTop: 4, fontSize: "9pt", color: "#44608f" }}>İmza / Tarih</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{props.right}</div>
        <div style={{ height: 70, display: "flex", alignItems: "flex-end" }}>
          {props.rightImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.rightImage} alt="imza" style={{ maxHeight: 66, maxWidth: "100%" }} />
          )}
        </div>
        <div style={{ borderTop: "1px solid #94a8c8", paddingTop: 4, fontSize: "9pt", color: "#44608f" }}>İmza / Tarih</div>
      </div>
    </div>
  );
}

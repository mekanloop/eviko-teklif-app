"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatSayi, parseSayi, tlToKurus } from "@/lib/engine/money";

export function cx(...a: Array<string | false | null | undefined>): string {
  return a.filter(Boolean).join(" ");
}

export function PageHeader(props: { title: string; sub?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {props.back}
        <h1 className="truncate text-2xl font-bold tracking-tight text-navy-800">{props.title}</h1>
        {props.sub && <div className="mt-0.5 text-sm text-navy-500">{props.sub}</div>}
      </div>
      {props.actions && <div className="flex flex-wrap items-center gap-2">{props.actions}</div>}
    </div>
  );
}

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; xl?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [props]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className={cx("flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl", props.xl ? "sm:max-w-6xl" : props.wide ? "sm:max-w-3xl" : "sm:max-w-xl")}>
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="text-lg font-bold text-navy-800">{props.title}</h2>
          <button className="btn btn-ghost btn-sm !min-h-[40px] !w-10 !px-0" onClick={props.onClose} aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{props.children}</div>
        {props.footer && <div className="flex justify-end gap-2 border-t border-navy-100 px-5 py-3 safe-b">{props.footer}</div>}
      </div>
    </div>
  );
}

export function Field(props: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx("block", props.className)}>
      <span className="label">{props.label}</span>
      {props.children}
      {props.hint && <span className="mt-1 block text-xs text-navy-400">{props.hint}</span>}
    </label>
  );
}

export function TextInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  list?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      className={cx("input", props.className)}
      value={props.value}
      type={props.type ?? "text"}
      list={props.list}
      autoFocus={props.autoFocus}
      disabled={props.disabled}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

export function TextArea(props: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; disabled?: boolean; className?: string }) {
  return (
    <textarea
      className={cx("input !py-2", props.className)}
      rows={props.rows ?? 3}
      value={props.value}
      disabled={props.disabled}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

const fmtNum = (v: number | undefined): string => (v == null || Number.isNaN(v) ? "" : String(v).replace(".", ","));

/** Sayı alanı: yazarken serbest metin tutar, geçerli sayıyı üste bildirir. */
export function NumField(props: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  suffix?: string;
}) {
  const [txt, setTxt] = useState(fmtNum(props.value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setTxt(fmtNum(props.value));
  }, [props.value]);
  const input = (
    <input
      className={cx("input", props.suffix && "pr-10", props.className)}
      inputMode="decimal"
      value={txt}
      disabled={props.disabled}
      placeholder={props.placeholder}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setTxt(fmtNum(props.value));
      }}
      onChange={(e) => {
        const v = e.target.value;
        setTxt(v);
        if (v.trim() === "") return props.onChange(undefined);
        const n = parseSayi(v);
        if (n !== null) props.onChange(n);
      }}
    />
  );
  if (!props.suffix) return input;
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-navy-400">{props.suffix}</span>
    </div>
  );
}

/** TL alanı; değer kuruş olarak okunur/yazılır. */
export function MoneyField(props: { value: number; onChange: (kurus: number) => void; className?: string; disabled?: boolean; placeholder?: string }) {
  return (
    <NumField
      className={props.className}
      disabled={props.disabled}
      placeholder={props.placeholder ?? "0"}
      suffix="₺"
      value={props.value ? props.value / 100 : undefined}
      onChange={(n) => props.onChange(n == null ? 0 : tlToKurus(n))}
    />
  );
}

export function Select<T extends string>(props: {
  value: T | "";
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <select className={cx("input pr-8", props.className)} value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value as T)}>
      {props.placeholder != null && <option value="">{props.placeholder}</option>}
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      className="inline-flex min-h-[44px] items-center gap-2 disabled:opacity-50"
    >
      <span className={cx("relative h-7 w-12 rounded-full transition", props.checked ? "bg-navy-700" : "bg-navy-200")}>
        <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", props.checked ? "left-[22px]" : "left-0.5")} />
      </span>
      {props.label && <span className="text-sm text-navy-700">{props.label}</span>}
    </button>
  );
}

const TONES: Record<string, string> = {
  gray: "bg-navy-100 text-navy-700",
  blue: "bg-blue-100 text-blue-800",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  bronze: "bg-bronze-100 text-bronze-700",
};
export function Badge(props: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[props.tone ?? "gray"])}>{props.children}</span>;
}

export function Empty(props: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-navy-200 bg-white/60 px-6 py-10 text-center">
      <div className="text-base font-semibold text-navy-700">{props.title}</div>
      {props.sub && <div className="max-w-md text-sm text-navy-500">{props.sub}</div>}
      {props.action && <div className="mt-2">{props.action}</div>}
    </div>
  );
}

export function Tabs<T extends string>(props: { value: T; onChange: (v: T) => void; tabs: Array<{ value: T; label: string; count?: number }> }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
      {props.tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => props.onChange(t.value)}
          className={cx(
            "min-h-[40px] shrink-0 rounded-xl px-4 text-sm font-semibold transition",
            props.value === t.value ? "bg-navy-800 text-white" : "bg-white text-navy-600 hover:bg-navy-100",
          )}
        >
          {t.label}
          {t.count != null && t.count > 0 && <span className={cx("ml-2 rounded-full px-1.5 text-xs", props.value === t.value ? "bg-white/20" : "bg-navy-100")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stat(props: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "warn" | "good" }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-navy-500">{props.label}</div>
      <div className={cx("mt-1 text-2xl font-bold", props.tone === "warn" ? "text-amber-700" : props.tone === "good" ? "text-emerald-700" : "text-navy-800")}>{props.value}</div>
      {props.sub && <div className="mt-0.5 text-xs text-navy-500">{props.sub}</div>}
    </div>
  );
}

export function DatalistOptions(props: { id: string; values: string[] }) {
  return (
    <datalist id={props.id}>
      {Array.from(new Set(props.values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr")).map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  );
}

export function Loading() {
  return <div className="p-8 text-center text-sm text-navy-400">Yükleniyor…</div>;
}

export { formatSayi };

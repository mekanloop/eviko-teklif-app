"use client";

import { CalendarDays, FileText, FolderKanban, LayoutDashboard, ListChecks, Settings, Tags, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/projeler", label: "Projeler", icon: FolderKanban },
  { href: "/musteriler", label: "Müşteriler", icon: Users },
  { href: "/teklifler", label: "Teklifler", icon: FileText },
  { href: "/fiyatlar", label: "Fiyat Listesi", icon: Tags },
  { href: "/sablonlar", label: "Şablonlar", icon: ListChecks },
  { href: "/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

function active(path: string, href: string): boolean {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen md:pl-[76px] lg:pl-[236px]">
      {/* Yan menü (iPad ve masaüstü) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col bg-navy-800 text-white md:flex lg:w-[236px] safe-t">
        <div className="flex h-[72px] items-center justify-center border-b border-white/10 lg:justify-start lg:px-5">
          <div className="hidden lg:block">
            <div className="text-lg font-extrabold tracking-wide">EVİKO</div>
            <div className="mt-0.5 h-0.5 w-8 bg-bronze-400" />
            <div className="mt-1 text-[11px] uppercase tracking-widest text-navy-200">Teklif & İş Takip</div>
          </div>
          <div className="text-xl font-extrabold lg:hidden">EV</div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const on = active(path, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "flex min-h-[48px] items-center justify-center gap-3 rounded-xl px-3 text-[15px] font-medium transition lg:justify-start",
                  on ? "bg-white/15 text-white" : "text-navy-200 hover:bg-white/10 hover:text-white",
                )}
                title={n.label}
              >
                <Icon size={21} className={on ? "text-bronze-300" : ""} />
                <span className="hidden lg:inline">{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-7">{children}</main>

      {/* Alt menü (telefon) */}
      <nav className="no-print safe-b fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-navy-200 bg-white md:hidden">
        {NAV.map((n) => {
          const Icon = n.icon;
          const on = active(path, n.href);
          return (
            <Link key={n.href} href={n.href} className={cx("flex min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium", on ? "text-navy-800" : "text-navy-400")}>
              <Icon size={20} className={on ? "text-bronze-500" : ""} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

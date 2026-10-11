import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { Boot } from "@/components/Boot";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Boot>
      <AppShell>{children}</AppShell>
    </Boot>
  );
}

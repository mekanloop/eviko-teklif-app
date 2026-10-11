import type { ReactNode } from "react";
import { Boot } from "@/components/Boot";

export default function PrintLayout({ children }: { children: ReactNode }) {
  return <Boot>{children}</Boot>;
}

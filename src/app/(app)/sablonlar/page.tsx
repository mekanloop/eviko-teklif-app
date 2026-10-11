"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/ui";

/** Eski adres: iş kalemleri artık Fiyat Listesi > İş kalemleri sekmesinde. */
export default function TemplatesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/fiyatlar#kalemler");
  }, [router]);
  return <Loading />;
}

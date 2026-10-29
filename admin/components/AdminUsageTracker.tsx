"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { adminPageEvent } from "@/lib/featureUsageCatalog.mjs";

export default function AdminUsageTracker() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const event = adminPageEvent(pathname);
    if (!event) return;
    void fetch("/admin/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), event }),
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }, [pathname]);
  return null;
}

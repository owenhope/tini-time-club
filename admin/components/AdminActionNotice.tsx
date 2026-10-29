"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ADMIN_ACTION_NOTICE } from "@/components/AdminActionForm";
import { adminActionFeedback } from "@/lib/adminActionFeedback.mjs";

type Notice = { kind: string; message: string };

export default function AdminActionNotice() {
  const pathname = usePathname();
  const params = useSearchParams();
  const route = `${pathname}?${params}`;
  const [eventNotice, setEventNotice] = useState<{
    route: string;
    notice: Notice;
  } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    const receive = (event: Event) => {
      const notice = (event as CustomEvent<Notice | null>).detail;
      setEventNotice(
        notice
          ? {
              route: `${window.location.pathname}?${new URLSearchParams(window.location.search)}`,
              notice,
            }
          : null
      );
      setDismissed(null);
    };
    window.addEventListener(ADMIN_ACTION_NOTICE, receive);
    return () => window.removeEventListener(ADMIN_ACTION_NOTICE, receive);
  }, []);
  const notice =
    eventNotice?.route === route
      ? eventNotice.notice
      : adminActionFeedback(params);
  const key = `${route}:${notice?.kind}:${notice?.message}`;
  if (!pathname.startsWith("/admin") || !notice || dismissed === key)
    return null;
  return (
    <div
      role={notice.kind === "error" ? "alert" : "status"}
      className={`fixed bottom-5 right-5 z-[110] flex max-w-[min(28rem,calc(100vw-2.5rem))] items-start gap-4 rounded-lg border p-4 text-sm font-semibold shadow-lg ${notice.kind === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
    >
      <p>{notice.message}</p>
      <button
        type="button"
        aria-label="Dismiss message"
        className="shrink-0 px-1 text-lg"
        onClick={() => setDismissed(key)}
      >
        ×
      </button>
    </div>
  );
}

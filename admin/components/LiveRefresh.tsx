"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const REFRESH_MS = 10_000;

/** Refreshes the server-rendered snapshot only while this tab is visible. */
export default function LiveRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    REFRESH_MS / 1000
  );

  useEffect(() => {
    const countdown = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setSecondsUntilRefresh((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    const refresh = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setSecondsUntilRefresh(REFRESH_MS / 1000);
      startTransition(() => router.refresh());
    }, REFRESH_MS);
    return () => {
      window.clearInterval(countdown);
      window.clearInterval(refresh);
    };
  }, [router]);

  const refreshNow = () => {
    setSecondsUntilRefresh(REFRESH_MS / 1000);
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
        </span>
        {isPending ? "Refreshing…" : `Live · ${secondsUntilRefresh}s`}
      </span>
      <button
        type="button"
        onClick={refreshNow}
        disabled={isPending}
        className="h-8 rounded-md border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-50"
      >
        Refresh now
      </button>
    </div>
  );
}

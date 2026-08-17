"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const NAVIGATION_START_EVENT = "tini-admin-navigation-start";

export function startAdminNavigation(href?: string) {
  if (href) {
    const destination = new URL(href, window.location.href);
    const current = `${window.location.pathname}${window.location.search}`;
    if (`${destination.pathname}${destination.search}` === current) return;
  }

  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}

export default function AdminNavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentRoute = `${pathname}${search ? `?${search}` : ""}`;
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const pending = pendingFrom === currentRoute;

  useEffect(() => {
    const handleNavigationStart = () => setPendingFrom(currentRoute);
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      const destinationRoute = `${destination.pathname}${destination.search}`;
      if (
        destination.origin !== window.location.origin ||
        !destination.pathname.startsWith("/admin") ||
        destinationRoute === currentRoute
      ) {
        return;
      }

      handleNavigationStart();
    };

    window.addEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
    window.addEventListener("popstate", handleNavigationStart);
    document.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
      window.removeEventListener("popstate", handleNavigationStart);
      document.removeEventListener("click", handleClick);
    };
  }, [currentRoute]);

  useEffect(() => {
    if (!pending) return;

    const timeout = window.setTimeout(() => setPendingFrom(null), 15000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  if (!pending || !pathname.startsWith("/admin")) return null;

  return (
    <div
      className="admin-theme pointer-events-none fixed inset-x-0 top-0 z-[100]"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="h-1 overflow-hidden bg-emerald-100">
        <div className="admin-navigation-progress h-full w-1/3 bg-chartreuse" />
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-lg">
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-900"
          aria-hidden="true"
        />
        Loading…
      </div>
    </div>
  );
}

"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GA_MEASUREMENT_ID, isTrackedPath } from "@/lib/adTracking";

/**
 * Google Analytics for public pages only. It loads the first time a visitor
 * reaches a tracked page, and GA's own opt-out flag is flipped on every
 * untracked page afterwards (/admin, /email/unsubscribe?token=…), so client
 * navigations there are never reported.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname();
  const tracked = isTrackedPath(pathname);
  const [loaded, setLoaded] = useState(tracked);
  if (tracked && !loaded) setLoaded(true);

  useEffect(() => {
    (window as unknown as Record<string, unknown>)[
      `ga-disable-${GA_MEASUREMENT_ID}`
    ] = !tracked;
  }, [tracked]);

  if (!loaded) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}

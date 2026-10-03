"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  isTrackedPath,
  loadMetaPixel,
  META_PIXEL_ID,
  rememberMetaAdVisit,
} from "@/lib/adTracking";

/** Loads the Meta Pixel on public pages and reports each page view. */
export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!META_PIXEL_ID || !isTrackedPath(pathname)) return;
    rememberMetaAdVisit(window.location.search);
    loadMetaPixel(META_PIXEL_ID);
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}

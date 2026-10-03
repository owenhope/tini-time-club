"use client";

import {
  appStoreUrl,
  isMetaAdVisit,
  META_AD_CAMPAIGN,
  WEBSITE_CAMPAIGN,
} from "@/lib/appStoreLink.mjs";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    gtag?: (...args: unknown[]) => void;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const APP_STORE_PROVIDER_TOKEN =
  process.env.NEXT_PUBLIC_APP_STORE_PROVIDER_TOKEN;

const META_VISIT_KEY = "ttc:meta-ad-visit";

/** The operator dashboard is never tracked; everything else is public. */
export function isTrackedPath(pathname: string) {
  return pathname !== "/admin" && !pathname.startsWith("/admin/");
}

/**
 * Meta's base-code stub, installed directly so the queue exists before the
 * first PageView rather than racing a `next/script` load.
 */
export function loadMetaPixel(pixelId: string) {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", pixelId);
}

/** Remember for the session that this visitor landed from a Meta ad. */
export function rememberMetaAdVisit(search: string) {
  if (!isMetaAdVisit(search)) return;
  try {
    sessionStorage.setItem(META_VISIT_KEY, "1");
  } catch {
    // Storage can be unavailable (private mode); attribution is best-effort.
  }
}

function cameFromMetaAd() {
  if (isMetaAdVisit(window.location.search)) return true;
  try {
    return sessionStorage.getItem(META_VISIT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Store URL tagged with the App Store Connect campaign for this visitor. */
export function campaignAppStoreUrl() {
  return appStoreUrl({
    providerToken: APP_STORE_PROVIDER_TOKEN,
    campaign: cameFromMetaAd() ? META_AD_CAMPAIGN : WEBSITE_CAMPAIGN,
  });
}

/** Report an App Store tap to Meta (the ad conversion) and Google Analytics. */
export function trackAppStoreClick(placement: string) {
  window.fbq?.("track", "Lead", {
    content_name: "App Store",
    content_category: placement,
  });
  window.gtag?.("event", "app_store_click", { placement });
}

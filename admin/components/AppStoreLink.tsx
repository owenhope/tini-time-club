"use client";

import type { MouseEvent, ReactNode } from "react";
import { campaignAppStoreUrl, trackAppStoreClick } from "@/lib/adTracking";
import { appStoreUrl, WEBSITE_CAMPAIGN } from "@/lib/appStoreLink.mjs";

interface AppStoreLinkProps {
  /** Where on the site the link sits, reported with the click event. */
  placement: string;
  className?: string;
  children: ReactNode;
}

const DEFAULT_HREF = appStoreUrl({
  providerToken: process.env.NEXT_PUBLIC_APP_STORE_PROVIDER_TOKEN,
  campaign: WEBSITE_CAMPAIGN,
});

/**
 * App Store download link. The server-rendered href is the generic website
 * campaign; on tap it switches to the Meta campaign for ad visitors and
 * reports the conversion before the browser leaves for the store.
 */
export default function AppStoreLink({
  placement,
  className,
  children,
}: AppStoreLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.currentTarget.href = campaignAppStoreUrl();
    trackAppStoreClick(placement);
  }

  return (
    <a href={DEFAULT_HREF} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

"use client";

import type { ReactNode } from "react";
import { trackGooglePlayClick } from "@/lib/adTracking";
import { ANDROID_AVAILABLE, GOOGLE_PLAY_URL } from "@/lib/appStoreLink.mjs";

interface GooglePlayLinkProps {
  /** Where on the site the link sits, reported with the click event. */
  placement: string;
  className?: string;
  /** Shown while the Play listing is not public yet. */
  comingSoonClassName?: string;
  children: ReactNode;
}

/**
 * Google Play download link, or an inert "Android coming soon" label until
 * `ANDROID_AVAILABLE` is flipped.
 */
export default function GooglePlayLink({
  placement,
  className,
  comingSoonClassName,
  children,
}: GooglePlayLinkProps) {
  if (!ANDROID_AVAILABLE) {
    return (
      <span className={comingSoonClassName ?? className}>
        Android coming soon
      </span>
    );
  }

  return (
    <a
      href={GOOGLE_PLAY_URL}
      onClick={() => trackGooglePlayClick(placement)}
      className={className}
    >
      {children}
    </a>
  );
}

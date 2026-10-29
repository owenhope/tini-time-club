import type { AnalyticEventType } from "@/services/analyticsService";

const SCREENS: Record<string, AnalyticEventType> = {
  home: "screen_home",
  discover: "screen_discover",
  profile: "screen_profile",
  passport: "screen_passport",
  settings: "screen_settings",
  "favorite-location": "screen_favorite_location",
  "edit-profile": "screen_edit_profile",
  notifications: "screen_notifications",
  "martini-index": "screen_martini_index",
  activity: "screen_activity",
  review: "screen_review",
  "review-share-preview": "screen_review_share_preview",
  "golden-glass-info": "screen_golden_glass_info",
  "passport-info": "screen_passport_info",
  "place-info": "screen_place_info",
  "delete-account": "screen_delete_account",
  terms: "screen_terms",
};

/** Classify locally. Never send URLs, queries, usernames or content IDs. */
export function screenUsageEvent(pathname: string): AnalyticEventType | null {
  const path = pathname.replace(/\([^/]+\)\/?/g, "").replace(/\/$/, "");
  if (/^\/places\/[^/]+$/.test(path) || /^\/locations\/[^/]+$/.test(path))
    return "screen_venue";
  if (/^\/users\/[^/]+\/followers$/.test(path)) return "screen_followers";
  if (/^\/users\/[^/]+\/following$/.test(path)) return "screen_following";
  if (/^\/users\/[^/]+$/.test(path) || /^\/u\/[^/]+$/.test(path))
    return "screen_member";
  if (/^\/r\/[^/]+$/.test(path)) return "screen_review_detail";
  return SCREENS[path.slice(1)] ?? null;
}

/** Renders and query changes are not visits; leaving and returning is. */
export function createScreenVisitTracker(
  capture: (event: AnalyticEventType) => void
) {
  let previous: string | null = null;
  return (pathname: string) => {
    if (pathname === previous) return;
    previous = pathname;
    const event = screenUsageEvent(pathname);
    if (event) capture(event);
  };
}

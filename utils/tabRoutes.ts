/**
 * Builds hrefs for screens that exist in several tab stacks (user profiles,
 * place profiles) so shared components push into the tab they're rendered in
 * instead of teleporting to the Feed stack. Pass the current `usePathname()`
 * value; the first segment is the tab whose stack should receive the push.
 */

import type { Href } from "expo-router";

const TAB_SEGMENTS = ["home", "discover", "locations", "profile"] as const;

function currentTab(pathname: string): (typeof TAB_SEGMENTS)[number] {
  const first = pathname.split("/")[1];
  return (TAB_SEGMENTS as readonly string[]).includes(first)
    ? (first as (typeof TAB_SEGMENTS)[number])
    : "home";
}

export function userHref(pathname: string, username: string): Href {
  // The template can't be narrowed to the typed-route union because the tab
  // segment is only known at runtime; every produced path exists in each tab.
  return `/${currentTab(pathname)}/users/${username}` as Href;
}

export function locationHref(
  pathname: string,
  locationId: string | number | undefined
): Href {
  const tab = currentTab(pathname);
  // The Places tab hosts the place screen at its stack root
  // (/locations/[location]), not under a nested /locations segment.
  if (tab === "locations") return `/locations/${locationId}` as Href;
  return `/${tab}/locations/${locationId}` as Href;
}

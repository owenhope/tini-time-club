export const APP_STORE_ID = "6741620393";

const APP_STORE_BASE_URL = `https://apps.apple.com/app/tini-time-club/id${APP_STORE_ID}`;

/** App Store Connect campaign token for visitors who arrived from a Meta ad. */
export const META_AD_CAMPAIGN = "meta-web";
/** Campaign token for every other tinitimeclub.com visitor. */
export const WEBSITE_CAMPAIGN = "website";

const META_UTM_SOURCES = new Set(["facebook", "fb", "instagram", "ig", "meta"]);

/**
 * Meta appends `fbclid` to ad clicks; UTM sources cover links we tag
 * ourselves. Accepts a `location.search` string.
 */
export function isMetaAdVisit(search) {
  const params = new URLSearchParams(search);
  if (params.has("fbclid")) return true;
  const source = params.get("utm_source")?.trim().toLowerCase();
  return Boolean(source && META_UTM_SOURCES.has(source));
}

/**
 * App Store Connect only attributes installs to a campaign link when it
 * carries the provider token (`pt`). Without one, fall back to the plain
 * store URL rather than emit a half-formed campaign link.
 */
export function appStoreUrl({ providerToken, campaign }) {
  const token = providerToken?.trim();
  if (!token) return APP_STORE_BASE_URL;
  const url = new URL(APP_STORE_BASE_URL);
  url.searchParams.set("pt", token);
  url.searchParams.set("ct", campaign);
  url.searchParams.set("mt", "8");
  return url.toString();
}

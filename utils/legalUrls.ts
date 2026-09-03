const PUBLIC_SITE_ORIGIN =
  process.env.EXPO_PUBLIC_TTC_WEB_ORIGIN ?? "https://tinitimeclub.com";

export const LEGAL_URLS = {
  terms: `${PUBLIC_SITE_ORIGIN}/terms`,
  privacy: `${PUBLIC_SITE_ORIGIN}/privacy`,
} as const;

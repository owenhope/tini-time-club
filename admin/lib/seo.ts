import { ANDROID_AVAILABLE, GOOGLE_PLAY_URL } from "@/lib/appStoreLink.mjs";

export const siteAuthor = {
  "@type": "Organization",
  name: "Hope Media House Inc.",
  url: "https://tinitimeclub.com/about",
  logo: {
    "@type": "ImageObject",
    url: "https://tinitimeclub.com/tini-time-logo-purple.png",
    width: 1024,
    height: 1024,
  },
  sameAs: [
    "https://apps.apple.com/us/app/tini-time-club-martini-finder/id6741620393",
    ...(ANDROID_AVAILABLE ? [GOOGLE_PLAY_URL] : []),
    "https://ca.linkedin.com/company/hope-media-house",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@hopemediahouse.com",
    url: "https://tinitimeclub.com/support",
    availableLanguage: "en",
  },
};

// Mirror the App Store listing so invite and share previews read the same as
// the store: its title, and the opening line of its description.
export const siteTitle = "Tini Time Club, Martini Guide";

export const siteDescription =
  "Find your next great martini. Tini Time Club brings together martini reviews, a map of bars and restaurants, and a guide to finding your order.";

export const siteShareImage = {
  url: "https://tinitimeclub.com/tini-time-share.png",
  width: 1200,
  height: 630,
  alt: "Tini Time Club logo on the brand splash color",
};

export function createBreadcrumbList(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

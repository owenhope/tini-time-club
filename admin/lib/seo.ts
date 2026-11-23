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

// Shared discovery-first positioning for the website and store listings.
export const siteTagline = "Find your next great Martini";
export const siteTitle = "Tini Time Club | Find your next great Martini";

export const siteDescription = `${siteTagline}. Explore nearby bars, compare reviews from the club, and save your favorite spots with the Martini discovery app.`;

export const siteShareImage = {
  url: "https://tinitimeclub.com/tini-time-discover-share-v2.png",
  width: 1200,
  height: 630,
  alt: "Find your next great Martini — Tini Time Club app previews on a purple background",
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

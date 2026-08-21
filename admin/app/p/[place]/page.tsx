import type { Metadata } from "next";
import LocationShareCard from "@/components/LocationShareCard";
import OpenInAppAttempt from "@/components/OpenInAppAttempt";
import PublicShareHeader from "@/components/PublicShareHeader";
import { fetchPublicLocation, nativeLocationUrl } from "@/lib/publicLocation";
import { formatRating } from "@/lib/format";

export const dynamic = "force-dynamic";

const PUBLIC_ORIGIN = "https://tinitimeclub.com";

const reviewLabel = (count: number) =>
  `${count} ${count === 1 ? "review" : "reviews"}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const { place: locationId } = await params;
  const location = await fetchPublicLocation(locationId);
  const canonicalUrl = `${PUBLIC_ORIGIN}/p/${encodeURIComponent(location.id)}`;
  const title = `${location.name} on Tini Time Club`;
  const description =
    location.rating != null && location.total_ratings > 0
      ? `${formatRating(location.rating)} overall from ${reviewLabel(location.total_ratings)}.`
      : `See ${location.name} on Tini Time Club.`;
  const image = `${PUBLIC_ORIGIN}/tini-time-share.png`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Tini Time Club",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: "Tini Time Club logo on the brand splash color",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    other: {
      "al:ios:url": nativeLocationUrl(location.id),
      "al:ios:app_name": "Tini Time Club",
      "al:web:url": canonicalUrl,
    },
  };
}

export default async function PublicLocationPage({
  params,
}: {
  params: Promise<{ place: string }>;
}) {
  const { place: locationId } = await params;
  const location = await fetchPublicLocation(locationId);
  const appUrl = nativeLocationUrl(location.id);

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1C3A2E]">
      <OpenInAppAttempt url={appUrl} />

      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col sm:px-4 sm:py-5">
        <PublicShareHeader appUrl={appUrl} />

        <div className="px-[10px] pb-8 pt-3 sm:px-0 sm:pt-0">
          <LocationShareCard location={location} />
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import OpenInAppAttempt from "@/components/OpenInAppAttempt";
import PublicShareHeader from "@/components/PublicShareHeader";
import {
  fetchPublicLocation,
  nativeLocationUrl,
  type PublicLocationRegular,
} from "@/lib/publicLocation";
import {
  formatCityRegion,
  formatRating,
  stripNameFromAddress,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const PUBLIC_ORIGIN = "https://tinitimeclub.com";

const reviewOverall = (taste: number | null, presentation: number | null) =>
  taste == null || presentation == null
    ? null
    : Math.round(((taste + presentation) / 2) * 10) / 10;

const reviewLabel = (count: number) =>
  `${count} ${count === 1 ? "review" : "reviews"}`;

const RegularAvatar = ({ regular }: { regular: PublicLocationRegular }) => {
  const initial = regular.username.trim().charAt(0).toUpperCase() || "M";

  return (
    <span
      className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#D9D1FB] bg-[#2B2142] text-sm font-bold text-[#D9D1FB] shadow-[0_0_0_1px_rgba(250,249,246,0.7)]"
      title={regular.username}
    >
      {regular.avatar_public_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={regular.avatar_public_url}
          alt={regular.username}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
};

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
  const image = `${PUBLIC_ORIGIN}/tini-time-logo.png`;

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
          width: 200,
          height: 200,
          alt: "Tini Time Club logo",
        },
      ],
    },
    twitter: {
      card: "summary",
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
  const cityRegion = location.address
    ? formatCityRegion(stripNameFromAddress(location.name, location.address))
    : null;
  const hasRating = location.rating != null && location.total_ratings > 0;

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#08261f]">
      <OpenInAppAttempt url={appUrl} />

      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col sm:px-4 sm:py-5">
        <PublicShareHeader appUrl={appUrl} />

        <section className="bg-[#6B53A8] px-5 pb-7 pt-5 text-[#FAF9F6]">
          <h1 className="text-[34px] leading-[36px] font-black">
            {location.name}
          </h1>
          {cityRegion ? (
            <p className="mt-2 font-mono text-[15px] text-[#FAF9F6]/85">
              {cityRegion}
            </p>
          ) : null}

          <div className="mt-8 flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-[1.4px] uppercase">
                Overall
              </p>
              <p className="text-[44px] leading-[46px] font-black tabular-nums">
                {hasRating ? formatRating(location.rating) : "--"}
              </p>
              <p className="font-mono text-[14px]">
                {reviewLabel(location.total_ratings)}
              </p>
            </div>

            {location.regulars.length > 0 ? (
              <div className="flex flex-col items-end gap-3">
                <p className="text-[10px] font-bold tracking-[1.4px] uppercase">
                  Regulars
                </p>
                <div className="flex items-center pr-1">
                  {location.regulars.map((regular, index) => (
                    <span
                      key={`${regular.username}-${regular.rank}`}
                      className={index > 0 ? "-ml-2" : undefined}
                    >
                      <RegularAvatar regular={regular} />
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="bg-[#FAF9F6] px-5 pt-5 pb-4">
          <p className="text-[11px] font-bold tracking-[1.4px] text-[#7B60BC] uppercase">
            {location.total_ratings > 0
              ? reviewLabel(location.total_ratings)
              : "The record"}
          </p>
          <h2 className="mt-1 text-[28px] leading-8 font-black">Reviews</h2>
        </section>

        {location.reviews.length > 0 ? (
          <div className="grid grid-cols-3 gap-[2px] bg-[#FAF9F6]">
            {location.reviews.map((review) => {
              const overall = reviewOverall(review.taste, review.presentation);
              return (
                <Link
                  key={review.id}
                  href={`/r/${encodeURIComponent(review.id)}`}
                  aria-label={`Review by ${review.profile?.username ?? "a member"}${
                    overall == null ? "" : `, overall ${formatRating(overall)}`
                  }`}
                  className="relative aspect-square overflow-hidden bg-[#E5E6E8]"
                >
                  {review.image_public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.image_public_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}

                  {overall != null ? (
                    <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-[rgba(20,26,23,0.72)] px-1.5 py-1 text-[12px] leading-4 font-bold text-white tabular-nums">
                      <span className="relative h-[11px] w-[9px] rounded-full bg-[#336654]">
                        <span className="absolute top-[2px] right-[1px] h-[3px] w-[3px] rounded-full bg-[#E8763D]" />
                      </span>
                      {formatRating(overall)}
                    </span>
                  ) : null}

                  {review.profile?.username ? (
                    <span className="absolute bottom-1.5 left-1.5 max-w-[88%] truncate rounded-[4px] bg-[rgba(20,26,23,0.72)] px-1.5 py-1 text-[11px] leading-4 text-white">
                      {review.profile.username}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="bg-[#FAF9F6] px-5 pb-10 text-center text-sm text-[#6E7472]">
            Nobody&apos;s given a verdict here yet. Be first.
          </p>
        )}
      </div>
    </main>
  );
}

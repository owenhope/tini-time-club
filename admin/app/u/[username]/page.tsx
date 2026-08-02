import type { Metadata } from "next";
import Link from "next/link";
import OpenInAppAttempt from "@/components/OpenInAppAttempt";
import {
  fetchPublicProfile,
  nativeProfileUrl,
  profileRankName,
  reviewOverall,
} from "@/lib/publicProfile";

/* Public Supabase and signed URLs are rendered directly here. */
/* eslint-disable @next/next/no-img-element */

export const dynamic = "force-dynamic";

const PUBLIC_ORIGIN = "https://tinitimeclub.com";
const FALLBACK_IMAGE = "/nightlife-martini-table.png";

const formatRating = (rating?: number | null) =>
  rating == null ? "—" : Number(rating).toFixed(1);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  const canonicalUrl = `${PUBLIC_ORIGIN}/u/${encodeURIComponent(profile.username)}`;
  const title = `@${profile.username} on Tini Time Club`;
  const reviewCount = profile.review_count ?? profile.reviews.length;
  const description =
    reviewCount === 1
      ? `Follow @${profile.username}'s Martini reviews on Tini Time Club.`
      : `Follow @${profile.username}'s ${reviewCount} Martini reviews on Tini Time Club.`;
  const image =
    profile.reviews.find((review) => review.image_public_url)
      ?.image_public_url ??
    profile.avatar_public_url ??
    FALLBACK_IMAGE;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Tini Time Club",
      type: "profile",
      images: [
        {
          url: image,
          width: 1200,
          height: 1200,
          alt: `@${profile.username} on Tini Time Club`,
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
      "al:ios:url": nativeProfileUrl(profile.username),
      "al:ios:app_name": "Tini Time Club",
      "al:web:url": canonicalUrl,
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  const appUrl = nativeProfileUrl(profile.username);
  const reviewCount = profile.review_count ?? profile.reviews.length;
  const rank = profileRankName(reviewCount);

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-emerald-950">
      <OpenInAppAttempt url={appUrl} />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-7">
        <Link href="/" className="text-sm font-semibold text-emerald-800">
          tini time club<span className="text-violet-500">.</span>
        </Link>

        <section className="grid flex-1 items-center gap-8 py-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <div className="flex items-center gap-4">
              {profile.avatar_public_url ? (
                <img
                  src={profile.avatar_public_url}
                  alt={`@${profile.username}`}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-white"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-950 text-3xl font-black text-white ring-4 ring-white">
                  {profile.username.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-900/55">
                  {rank}
                </p>
                <h1 className="truncate text-4xl font-black tracking-tight md:text-6xl">
                  @{profile.username}
                </h1>
              </div>
            </div>

            {profile.name || profile.bio ? (
              <div className="mt-6 max-w-xl space-y-2">
                {profile.name ? (
                  <p className="text-xl font-bold">{profile.name}</p>
                ) : null}
                {profile.bio ? (
                  <p className="text-lg leading-8 text-emerald-900/70">
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["Reviews", reviewCount],
                ["Followers", profile.followers_count],
                ["Following", profile.following_count],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[8px] border border-emerald-950/10 bg-white p-4"
                >
                  <p className="text-2xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-900/50">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={appUrl}
                className="rounded-lg bg-emerald-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                Open in app
              </a>
              <a
                href="https://apps.apple.com"
                className="rounded-lg border border-emerald-950/20 bg-white px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50"
              >
                Get the app
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.reviews.map((review) => {
              const overall = reviewOverall(review);
              const venueRating =
                review.location?.rating != null &&
                (review.location.total_ratings ?? 0) > 0
                  ? Number(review.location.rating)
                  : null;
              return (
                <article
                  key={review.id}
                  className="overflow-hidden rounded-[8px] border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/5"
                >
                  {review.image_public_url ? (
                    <img
                      src={review.image_public_url}
                      alt={review.location?.name ?? "Martini review"}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-emerald-950/10" />
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-bold">
                      {review.location?.name ?? "Martini review"}
                    </p>
                    <p className="mt-1 text-xs text-emerald-900/60">
                      {overall == null ? "Review" : `${overall.toFixed(1)}/5`}
                    </p>
                    {venueRating != null ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-900/70">
                        {formatRating(venueRating)} venue
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {profile.reviews.length === 0 ? (
              <div className="col-span-full rounded-[8px] border border-emerald-950/10 bg-white p-8 text-center text-sm text-emerald-900/60">
                No public reviews yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

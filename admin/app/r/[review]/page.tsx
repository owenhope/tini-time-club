import type { Metadata } from "next";
import Link from "next/link";
import OpenInAppAttempt from "@/components/OpenInAppAttempt";
import {
  fetchPublicReview,
  nativeReviewUrl,
  reviewOverall,
} from "@/lib/publicReview";

/* Signed Supabase image URLs are short-lived and host-specific; keep this
   plain so the public page does not depend on Next image remote config. */
/* eslint-disable @next/next/no-img-element */

export const dynamic = "force-dynamic";

const PUBLIC_ORIGIN = "https://ttc.hopemediahouse.com";
const FALLBACK_IMAGE = "/nightlife-martini-table.png";

const formatRating = (rating?: number | null) =>
  rating == null ? "—" : Number(rating).toFixed(1);

const reviewCountLabel = (count?: number | null) => {
  const n = count ?? 0;
  return n === 1 ? "1 review" : `${n} reviews`;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ review: string }>;
}): Promise<Metadata> {
  const { review: reviewId } = await params;
  const review = await fetchPublicReview(reviewId);
  const place = review.location?.name ?? "a Martini spot";
  const username = review.profile?.username ?? "A TTC member";
  const score = reviewOverall(review);
  const canonicalUrl = `${PUBLIC_ORIGIN}/r/${encodeURIComponent(review.id)}`;
  const title =
    score == null
      ? `${username}'s Martini review at ${place}`
      : `${username} rated ${place} ${score.toFixed(1)}/5`;
  const description =
    score == null
      ? "Open this Tini Time Club review."
      : `Taste ${review.taste}/5 · Presentation ${review.presentation}/5 on Tini Time Club.`;
  const image = `${canonicalUrl}/opengraph-image`;
  const imageAlt = `Review at ${place}`;

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
      type: "article",
      images: [
        {
          url: image,
          width: 1200,
          height: 1200,
          alt: imageAlt,
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
      "al:ios:url": nativeReviewUrl(review.id),
      "al:ios:app_name": "Tini Time Club",
      "al:web:url": canonicalUrl,
    },
  };
}

export default async function PublicReviewPage({
  params,
}: {
  params: Promise<{ review: string }>;
}) {
  const { review: reviewId } = await params;
  const review = await fetchPublicReview(reviewId);
  const appUrl = nativeReviewUrl(review.id);
  const overall = reviewOverall(review);
  const venueRating =
    review.location?.rating != null && (review.location.total_ratings ?? 0) > 0
      ? Number(review.location.rating)
      : null;

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#08261f]">
      <OpenInAppAttempt url={appUrl} />
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col px-4 py-5">
        <header className="mb-4 flex items-center justify-between">
          <Link href="/" className="text-[15px] font-black tracking-tight">
            tini time club<span className="text-[#8e7ce8]">.</span>
          </Link>
          <a
            href={appUrl}
            className="rounded-lg bg-[#08261f] px-3 py-2 text-xs font-bold text-white"
          >
            Open in app
          </a>
        </header>

        <article className="overflow-hidden rounded-[8px] border border-black/10 bg-white shadow-2xl shadow-black/10">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#08261f] text-sm font-black text-white ring-2 ring-[#8e7ce8]">
                {(review.profile?.username ?? "T").slice(0, 1).toUpperCase()}
              </div>
              <p className="truncate text-[15px] font-bold">
                @{review.profile?.username ?? "tini-time"}
              </p>
            </div>
            <div className="flex gap-1.5 text-xl leading-none text-[#08261f]">
              <span>•••</span>
            </div>
          </div>

          <div className="relative aspect-square bg-[#d9d1fb]">
          {review.image_public_url ? (
            <img
              src={review.image_public_url}
              alt={`Review at ${review.location?.name ?? "a Martini spot"}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={FALLBACK_IMAGE}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
            <div className="absolute inset-0 flex flex-col justify-end gap-5 bg-black/42 p-5 text-white">
              <div>
                <h1 className="text-[22px] font-black leading-tight">
                  {review.location?.name ?? "Martini review"}
                </h1>
                {review.location?.address ? (
                  <p className="mt-1 text-[13px] text-white/86">
                    {review.location.address}
                  </p>
                ) : null}
                {venueRating != null ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#08261f]/80 px-3 py-1.5 text-xs font-bold">
                    <span className="text-[#d9d1fb]">★</span>
                    <span>{formatRating(venueRating)} venue rating</span>
                    <span className="font-medium text-white/75">
                      {reviewCountLabel(review.location?.total_ratings)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-end justify-between gap-5">
                <div className="flex gap-8">
                  <div>
                    <p className="text-[12px] text-white/80">Spirit</p>
                    <p className="text-[17px] font-bold capitalize">
                      {review.spirit?.name ?? "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-white/80">Type</p>
                    <p className="text-[17px] font-bold capitalize">
                      {review.type?.name ?? "N/A"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-white/80">
                    Overall
                  </p>
                  <p className="text-[34px] font-black leading-none">
                    {formatRating(overall)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <div className="flex items-center gap-3 text-[22px] leading-none">
              <span>♡</span>
              <span>💬</span>
              <span>✈</span>
            </div>
            {review.comment ? (
              <p className="text-[15px] leading-6">
                <span className="font-bold">
                  @{review.profile?.username ?? "tini-time"}
                </span>{" "}
                {review.comment}
              </p>
            ) : null}
            <p className="text-[11px] font-medium uppercase text-black/45">
              Shared from Tini Time Club
            </p>
          </div>
        </article>

        <div className="mt-4 flex gap-3">
          <a
            href={appUrl}
            className="flex-1 rounded-lg bg-[#08261f] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#134238]"
          >
            Open in app
          </a>
          <a
            href="https://apps.apple.com"
            className="flex-1 rounded-lg border border-black/15 bg-white px-5 py-3 text-center text-sm font-bold transition hover:bg-black/5"
          >
            Get the app
          </a>
        </div>
      </div>
    </main>
  );
}

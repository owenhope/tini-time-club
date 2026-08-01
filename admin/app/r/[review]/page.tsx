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
  const image = review.image_public_url ?? FALLBACK_IMAGE;
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

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-emerald-950">
      <OpenInAppAttempt url={appUrl} />
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-5 py-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section>
          <Link href="/" className="text-sm font-semibold text-emerald-800">
            tini time club<span className="text-violet-500">.</span>
          </Link>
          <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
            {review.location?.name ?? "Martini review"}
          </h1>
          <p className="mt-3 max-w-xl text-lg text-emerald-900/70">
            {review.profile?.username
              ? `Reviewed by @${review.profile.username}`
              : "Shared from Tini Time Club"}
            {overall == null ? "" : ` · ${overall.toFixed(1)}/5`}
          </p>

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
        </section>

        <article className="overflow-hidden rounded-[8px] border border-emerald-950/10 bg-white shadow-2xl shadow-emerald-950/10">
          {review.image_public_url ? (
            <img
              src={review.image_public_url}
              alt={`Review at ${review.location?.name ?? "a Martini spot"}`}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="aspect-square w-full bg-emerald-950/10" />
          )}
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/50">
                  Overall
                </p>
                <p className="text-3xl font-black">
                  {overall == null ? "—" : overall.toFixed(1)}
                </p>
              </div>
              <div className="text-right text-sm text-emerald-900/60">
                <p>{review.spirit?.name ?? "Spirit"}</p>
                <p>{review.type?.name ?? "Type"}</p>
              </div>
            </div>
            {review.comment ? (
              <p className="text-base leading-7 text-emerald-950">
                “{review.comment}”
              </p>
            ) : null}
            {review.location?.address ? (
              <p className="text-sm text-emerald-900/55">
                {review.location.address}
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </main>
  );
}

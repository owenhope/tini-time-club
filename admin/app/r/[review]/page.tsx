import type { Metadata } from "next";
import Link from "next/link";
import OpenInAppAttempt from "@/components/OpenInAppAttempt";
import ReviewShareCard from "@/components/ReviewShareCard";
import {
  fetchPublicReview,
  nativeReviewUrl,
  reviewOverall,
} from "@/lib/publicReview";

export const dynamic = "force-dynamic";

const PUBLIC_ORIGIN = "https://tinitimeclub.com";

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
  const canonicalUrl = `${PUBLIC_ORIGIN}/r/${encodeURIComponent(review.id)}`;

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#08261f]">
      <OpenInAppAttempt url={appUrl} />

      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col sm:px-4 sm:py-5">
        <header className="flex items-center justify-between bg-[#f8f5ef] px-[10px] py-2 sm:mb-3">
          <Link href="/" aria-label="Tini Time Club">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tini-time-logo.png"
              alt="Tini Time Club"
              width={60}
              height={60}
              className="h-[60px] w-[60px] object-cover"
            />
          </Link>
          <a
            href={appUrl}
            className="text-sm font-bold text-[#08261f] underline-offset-4 hover:underline"
          >
            Join the Club
          </a>
        </header>

        {/* One-line pitch between the header and the review. */}
        <p className="bg-[#B6A3E2] px-3 py-1.5 text-center text-xs font-bold text-white sm:mb-3">
          Sip, snap, review, repeat. Welcome to the club.
        </p>

        <div className="px-5 sm:px-0">
          <ReviewShareCard review={review} shareUrl={canonicalUrl} />
        </div>
      </div>
    </main>
  );
}

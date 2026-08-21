import type { Metadata } from "next";
import OpenInAppAttempt from "@/components/OpenInAppAttempt";
import PublicShareHeader from "@/components/PublicShareHeader";
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
  const image = `${PUBLIC_ORIGIN}/tini-time-share.png`;

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

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1C3A2E]">
      <OpenInAppAttempt url={appUrl} />

      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col sm:px-4 sm:py-5">
        <PublicShareHeader appUrl={appUrl} />

        <div className="px-5 pt-3 sm:px-0 sm:pt-0">
          <ReviewShareCard review={review} />
        </div>
      </div>
    </main>
  );
}

import "server-only";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface PublicReview {
  id: string;
  comment: string | null;
  image_url: string | null;
  image_public_url: string | null;
  inserted_at: string;
  taste: number | null;
  presentation: number | null;
  location: {
    id: number;
    name: string | null;
    address: string | null;
    rating: number | null;
    total_ratings: number | null;
  } | null;
  spirit: { name: string | null } | null;
  type: { name: string | null } | null;
  profile: {
    id: string;
    username: string | null;
    is_verified: boolean | null;
    deleted: boolean | null;
  } | null;
}

export const reviewOverall = (review: PublicReview): number | null => {
  if (review.taste == null || review.presentation == null) return null;
  return Math.round(((review.taste + review.presentation) / 2) * 10) / 10;
};

export const nativeReviewUrl = (reviewId: string | number) =>
  `tini-time-club:///r/${encodeURIComponent(String(reviewId))}`;

export const fetchPublicReview = async (
  reviewId: string
): Promise<PublicReview> => {
  const { data, error } = await supabaseAdmin()
    .from("reviews")
    .select(
      `
      id,
      comment,
      image_url,
      inserted_at,
      taste,
      presentation,
      location:locations!reviews_location_fkey(id,name,address),
      spirit:spirits(name),
      type:types(name),
      profile:profiles!reviews_user_id_fkey1(id,username,is_verified,deleted)
    `
    )
    .eq("id", reviewId)
    .eq("state", 1)
    .single();

  const review = data as unknown as Omit<PublicReview, "image_public_url">;

  if (error || !review || review.profile?.deleted) notFound();

  let location = review.location;
  if (review.location?.id) {
    const { data: locationRating } = await supabaseAdmin()
      .from("location_ratings")
      .select("rating,total_ratings")
      .eq("id", review.location.id)
      .maybeSingle();
    location = {
      ...review.location,
      rating: locationRating?.rating ?? null,
      total_ratings: locationRating?.total_ratings ?? 0,
    };
  }

  let imagePublicUrl: string | null = null;
  if (review.image_url) {
    const { data: signed } = await supabaseAdmin()
      .storage.from("review_images")
      .createSignedUrl(review.image_url, 60 * 60);
    imagePublicUrl = signed?.signedUrl ?? null;
  }

  return {
    ...review,
    id: String(review.id),
    location,
    image_public_url: imagePublicUrl,
  };
};

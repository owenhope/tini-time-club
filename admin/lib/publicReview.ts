import "server-only";
import { notFound } from "next/navigation";
import { avatarPublicUrl } from "@/lib/avatar";
import { fetchWebMentionSpans, type WebMentionSpan } from "@/lib/mentions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface PublicReviewComment {
  id: number;
  body: string;
  username: string | null;
  is_verified: boolean | null;
  mentions: WebMentionSpan[];
}

export interface PublicReview {
  id: string;
  comment: string | null;
  image_url: string | null;
  image_public_url: string | null;
  inserted_at: string;
  taste: number | null;
  presentation: number | null;
  likes_count: number;
  comments_count: number;
  recent_comments: PublicReviewComment[];
  mentions: WebMentionSpan[];
  location: {
    id: number;
    name: string | null;
    address: string | null;
    rating: number | null;
    total_ratings: number | null;
    is_golden_glass: boolean;
    is_location_verified: boolean;
  } | null;
  spirit: { name: string | null } | null;
  type: { name: string | null } | null;
  profile: {
    id: string;
    username: string | null;
    is_verified: boolean | null;
    deleted: boolean | null;
    avatar_public_url: string | null;
    review_count: number | null;
  } | null;
}

export const reviewOverall = (review: {
  taste: number | null;
  presentation: number | null;
}): number | null => {
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
      profile:profiles!reviews_user_id_fkey1(id,username,is_verified,deleted,avatar_url,review_count)
    `
    )
    .eq("id", reviewId)
    .eq("state", 1)
    .single();

  const review = data as unknown as Omit<
    PublicReview,
    | "image_public_url"
    | "likes_count"
    | "comments_count"
    | "recent_comments"
    | "profile"
  > & {
    profile:
      | (NonNullable<PublicReview["profile"]> & { avatar_url: string | null })
      | null;
  };

  if (error || !review || review.profile?.deleted) notFound();

  const [
    { count: likesCount },
    { count: commentsCount },
    { data: recentComments },
    locationRatingResult,
    signedImageResult,
  ] = await Promise.all([
    supabaseAdmin()
      .from("likes")
      .select("review_id", { count: "exact", head: true })
      .eq("review_id", review.id),
    supabaseAdmin()
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("review_id", review.id),
    supabaseAdmin()
      .from("comments")
      .select("id,body,profile:profiles(username,is_verified,deleted)")
      .eq("review_id", review.id)
      .order("inserted_at", { ascending: false })
      .limit(2),
    review.location?.id
      ? supabaseAdmin()
          .from("location_ratings")
          .select("rating,total_ratings,is_golden_glass,is_location_verified")
          .eq("id", review.location.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    review.image_url
      ? supabaseAdmin()
          .storage.from("review_images")
          .createSignedUrl(review.image_url, 60 * 60)
      : Promise.resolve({ data: null }),
  ]);

  const location = review.location
    ? {
        ...review.location,
        rating: locationRatingResult.data?.rating ?? null,
        total_ratings: locationRatingResult.data?.total_ratings ?? 0,
        is_golden_glass: Boolean(locationRatingResult.data?.is_golden_glass),
        is_location_verified: Boolean(
          locationRatingResult.data?.is_location_verified
        ),
      }
    : null;

  const comments: PublicReviewComment[] = (recentComments ?? [])
    .map((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      if (profile?.deleted) return null;
      return {
        id: row.id as number,
        body: String(row.body ?? ""),
        username: profile?.username ?? null,
        is_verified: profile?.is_verified ?? null,
        mentions: [],
      };
    })
    .filter(Boolean) as PublicReviewComment[];
  const mentionRows = await fetchWebMentionSpans({
    reviewIds: [review.id],
    commentIds: comments.map((comment) => comment.id),
    audience: "public",
  });

  return {
    ...review,
    id: String(review.id),
    location,
    image_public_url: signedImageResult.data?.signedUrl ?? null,
    likes_count: likesCount ?? 0,
    comments_count: commentsCount ?? 0,
    mentions: mentionRows.reviews.get(String(review.id)) ?? [],
    // Oldest-first, matching the mobile footer's preview order.
    recent_comments: comments
      .map((comment) => ({
        ...comment,
        mentions: mentionRows.comments.get(String(comment.id)) ?? [],
      }))
      .reverse(),
    profile: review.profile
      ? {
          id: review.profile.id,
          username: review.profile.username,
          is_verified: review.profile.is_verified,
          deleted: review.profile.deleted,
          avatar_public_url: avatarPublicUrl(review.profile.avatar_url),
          review_count: review.profile.review_count,
        }
      : null,
  };
};

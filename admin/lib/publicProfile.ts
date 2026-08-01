import "server-only";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface PublicProfileReview {
  id: string;
  comment: string | null;
  image_url: string | null;
  image_public_url: string | null;
  inserted_at: string;
  taste: number | null;
  presentation: number | null;
  location: { id: number; name: string | null; address: string | null } | null;
}

export interface PublicProfile {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_public_url: string | null;
  is_verified: boolean | null;
  review_count: number | null;
  followers_count: number;
  following_count: number;
  reviews: PublicProfileReview[];
}

type RawPublicProfileReview = Omit<PublicProfileReview, "image_public_url"> & {
  location:
    | PublicProfileReview["location"]
    | NonNullable<PublicProfileReview["location"]>[];
};

export const nativeProfileUrl = (username: string) =>
  `tini-time-club:///u/${encodeURIComponent(username)}`;

export const profileRankName = (reviewCount: number) => {
  if (reviewCount >= 150) return "Top Shelf";
  if (reviewCount >= 50) return "Premium";
  if (reviewCount >= 10) return "Call";
  return "Well";
};

export const reviewOverall = (
  review: Pick<PublicProfileReview, "taste" | "presentation">
): number | null => {
  if (review.taste == null || review.presentation == null) return null;
  return Math.round(((review.taste + review.presentation) / 2) * 10) / 10;
};

export const fetchPublicProfile = async (
  username: string
): Promise<PublicProfile> => {
  const normalizedUsername = decodeURIComponent(username).replace(/^@/, "");
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select(
      "id,username,name,bio,avatar_url,is_verified,review_count,deleted"
    )
    .ilike("username", normalizedUsername)
    .eq("deleted", false)
    .single();

  if (error || !data || !data.username) notFound();

  const [followers, following, reviews] = await Promise.all([
    supabaseAdmin()
      .from("followers")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", data.id),
    supabaseAdmin()
      .from("followers")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", data.id),
    supabaseAdmin()
      .from("reviews")
      .select(
        `
        id,
        comment,
        image_url,
        inserted_at,
        taste,
        presentation,
        location:locations!reviews_location_fkey(id,name,address)
      `
      )
      .eq("user_id", data.id)
      .eq("state", 1)
      .order("inserted_at", { ascending: false })
      .limit(6),
  ]);

  let avatarPublicUrl: string | null = null;
  if (data.avatar_url) {
    avatarPublicUrl =
      supabaseAdmin().storage.from("avatars").getPublicUrl(data.avatar_url).data
        .publicUrl ?? null;
  }

  const reviewsWithImages = await Promise.all(
    ((reviews.data ?? []) as unknown as RawPublicProfileReview[]).map(
      async (review) => {
        const location = Array.isArray(review.location)
          ? (review.location[0] ?? null)
          : review.location;
        let imagePublicUrl: string | null = null;
        if (review.image_url) {
          const { data: signed } = await supabaseAdmin()
            .storage.from("review_images")
            .createSignedUrl(review.image_url, 60 * 60);
          imagePublicUrl = signed?.signedUrl ?? null;
        }
        return {
          ...review,
          location,
          id: String(review.id),
          image_public_url: imagePublicUrl,
        };
      }
    )
  );

  return {
    id: data.id,
    username: data.username,
    name: data.name,
    bio: data.bio,
    avatar_url: data.avatar_url,
    avatar_public_url: avatarPublicUrl,
    is_verified: data.is_verified,
    review_count: data.review_count,
    followers_count: followers.count ?? 0,
    following_count: following.count ?? 0,
    reviews: reviewsWithImages,
  };
};

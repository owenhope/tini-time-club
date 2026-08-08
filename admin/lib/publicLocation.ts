import "server-only";
import { notFound } from "next/navigation";
import { avatarPublicUrl } from "@/lib/avatar";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface PublicLocationReview {
  id: string;
  image_public_url: string | null;
  taste: number | null;
  presentation: number | null;
  profile: {
    username: string | null;
  } | null;
}

export interface PublicLocationRegular {
  rank: number;
  username: string;
  avatar_public_url: string | null;
  profile_review_count: number;
}

interface RegularRow {
  rank: number | string | null;
  username: string | null;
  avatar_url: string | null;
  profile_review_count: number | string | null;
}

export interface PublicLocation {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  taste_avg: number | null;
  presentation_avg: number | null;
  total_ratings: number;
  reviews: PublicLocationReview[];
  regulars: PublicLocationRegular[];
}

export const nativeLocationUrl = (locationId: string | number) =>
  `tini-time-club:///places/${encodeURIComponent(String(locationId))}`;

export const fetchPublicLocation = async (
  locationId: string
): Promise<PublicLocation> => {
  const client = supabaseAdmin();
  const { data: location, error: locationError } = await client
    .from("location_ratings")
    .select("id,name,address,rating,taste_avg,presentation_avg,total_ratings")
    .eq("id", locationId)
    .single();

  if (locationError || !location) notFound();

  const [{ data: reviewRows, error: reviewsError }, regularsResult] =
    await Promise.all([
      client
        .from("reviews")
        .select(
          `
          id,
          image_url,
          taste,
          presentation,
          profile:profiles!reviews_user_id_fkey1(username,deleted)
        `
        )
        .eq("location", locationId)
        .eq("state", 1)
        .order("inserted_at", { ascending: false })
        .limit(30),
      client.rpc("get_regulars_for_locations", {
        p_location_ids: [Number(locationId)],
        p_limit: 3,
      }),
    ]);

  if (reviewsError) throw reviewsError;
  if (regularsResult.error) throw regularsResult.error;

  const visibleReviews = (reviewRows ?? []).filter((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return !profile?.deleted;
  });
  const imagePaths = visibleReviews
    .map((review) => review.image_url)
    .filter((path): path is string => Boolean(path));
  const signedUrls = new Map<string, string>();

  if (imagePaths.length > 0) {
    const { data } = await client.storage
      .from("review_images")
      .createSignedUrls(imagePaths, 60 * 60);
    for (const item of data ?? []) {
      if (item.path && !item.error && item.signedUrl) {
        signedUrls.set(item.path, item.signedUrl);
      }
    }
  }

  const reviews: PublicLocationReview[] = visibleReviews.map((review) => {
    const profile = Array.isArray(review.profile)
      ? (review.profile[0] ?? null)
      : review.profile;
    return {
      id: String(review.id),
      image_public_url: review.image_url
        ? (signedUrls.get(review.image_url) ?? null)
        : null,
      taste: review.taste == null ? null : Number(review.taste),
      presentation:
        review.presentation == null ? null : Number(review.presentation),
      profile: profile ? { username: profile.username ?? null } : null,
    };
  });

  const regulars: PublicLocationRegular[] = (
    (regularsResult.data ?? []) as RegularRow[]
  ).map((regular) => ({
    rank: Number(regular.rank),
    username: String(regular.username ?? "Member"),
    avatar_public_url: avatarPublicUrl(regular.avatar_url),
    profile_review_count: Number(regular.profile_review_count) || 0,
  }));

  return {
    id: String(location.id),
    name: String(location.name),
    address: location.address ?? null,
    rating: location.rating == null ? null : Number(location.rating),
    taste_avg: location.taste_avg == null ? null : Number(location.taste_avg),
    presentation_avg:
      location.presentation_avg == null
        ? null
        : Number(location.presentation_avg),
    total_ratings: Number(location.total_ratings) || 0,
    reviews,
    regulars,
  };
};

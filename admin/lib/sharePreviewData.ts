import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface SharePreviewReview {
  id: string;
  comment: string | null;
  inserted_at: string;
  taste: number | null;
  presentation: number | null;
  location: { name: string | null } | null;
  profile: { username: string | null } | null;
}

export interface SharePreviewLocation {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  total_ratings: number;
}

const db = supabaseAdmin;

export const fetchSharePreviewReviews = async (
  limit = 20
): Promise<SharePreviewReview[]> => {
  const { data, error } = await db()
    .from("reviews")
    .select(
      "id,comment,inserted_at,taste,presentation,location:locations!reviews_location_fkey(name),profile:profiles!reviews_user_id_fkey1(username,deleted)"
    )
    .eq("state", 1)
    .order("inserted_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<
    Omit<SharePreviewReview, "id" | "location" | "profile"> & {
      id: string | number;
      location:
        SharePreviewReview["location"] | SharePreviewReview["location"][];
      profile:
        | (SharePreviewReview["profile"] & { deleted?: boolean | null })
        | (SharePreviewReview["profile"] & { deleted?: boolean | null })[];
    }
  >;

  return rows
    .map((review) => {
      const location = Array.isArray(review.location)
        ? (review.location[0] ?? null)
        : review.location;
      const profile = Array.isArray(review.profile)
        ? (review.profile[0] ?? null)
        : review.profile;

      if (profile?.deleted) return null;
      return {
        ...review,
        id: String(review.id),
        location,
        profile: profile ? { username: profile.username } : null,
      };
    })
    .filter(Boolean) as SharePreviewReview[];
};

export const fetchSharePreviewLocations = async (
  limit = 50
): Promise<SharePreviewLocation[]> => {
  const { data, error } = await db()
    .from("location_ratings")
    .select("id,name,address,rating,total_ratings")
    .order("total_ratings", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((location) => ({
    id: String(location.id),
    name: String(location.name),
    address: location.address ?? null,
    rating: location.rating == null ? null : Number(location.rating),
    total_ratings: Number(location.total_ratings) || 0,
  }));
};

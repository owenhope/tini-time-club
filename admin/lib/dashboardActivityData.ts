import "server-only";
import {
  fetchActiveLocationIds,
  fetchActiveMemberIds,
  fetchAuthUsers,
  fetchTopReviewers,
} from "@/lib/profileData";
import type { AdminProfile } from "@/lib/profileTypes";
import type { AdminReviewRow, TopReview } from "@/lib/reviewTypes";
import { emptyReviewEngagement } from "@/lib/reviewTypes";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface LatestLocation {
  id: number;
  name: string | null;
  address: string | null;
  inserted_at: string | null;
}

export interface LatestActivity {
  members: AdminProfile[];
  reviews: AdminReviewRow[];
  locations: LatestLocation[];
}

export interface TopLocation {
  id: number;
  name: string | null;
  rating: number | null;
  total_ratings: number;
}

export interface TopActivity {
  members: AdminProfile[];
  reviews: TopReview[];
  locations: TopLocation[];
}

const db = supabaseAdmin;

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

/**
 * The newest members, reviews and locations, for the dashboard's three
 * recent-activity lists. Signup order comes from auth.users, since profiles
 * has no created_at.
 */
export const fetchLatestActivity = async (
  limit = 10
): Promise<LatestActivity> => {
  const [authUsers, activeMemberIds] = await Promise.all([
    fetchAuthUsers(),
    fetchActiveMemberIds(),
  ]);
  const activeLocationIds = await fetchActiveLocationIds(activeMemberIds);

  const [reviews, locations] = await Promise.all([
    activeMemberIds.length > 0 && activeLocationIds.length > 0
      ? db()
          .from("reviews")
          .select(
            `id,comment,taste,presentation,inserted_at,state,
             location:locations!reviews_location_fkey(id,name),
             profile:profiles!reviews_user_id_fkey1(id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio)`
          )
          .eq("state", 1)
          .in("user_id", activeMemberIds)
          .in("location", activeLocationIds)
          .order("inserted_at", { ascending: false })
          .limit(limit)
      : { data: [], error: null },
    activeMemberIds.length > 0
      ? db()
          .from("locations")
          .select("id,name,address,inserted_at")
          .in("created_by", activeMemberIds)
          .order("inserted_at", { ascending: false, nullsFirst: false })
          .limit(limit)
      : { data: [], error: null },
  ]);
  if (reviews.error) throw new Error(reviews.error.message);
  if (locations.error) throw new Error(locations.error.message);

  const activeMemberIdSet = new Set(activeMemberIds);
  const newestIds = [...authUsers.entries()]
    .filter(([id]) => activeMemberIdSet.has(id))
    .sort(
      (a, b) =>
        new Date(b[1].created_at ?? 0).getTime() -
        new Date(a[1].created_at ?? 0).getTime()
    )
    .slice(0, limit)
    .map(([id]) => id);

  const { data: newestProfiles, error: profileError } =
    newestIds.length > 0
      ? await db()
          .from("profiles")
          .select(
            "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
          )
          .in("id", newestIds)
      : { data: [], error: null };
  if (profileError) throw new Error(profileError.message);

  // Ordered by the auth.users sort, not by the `in` result order.
  const members = newestIds
    .map((id) => {
      const profile = (newestProfiles ?? []).find((p) => p.id === id);
      if (!profile) return null;
      return { ...profile, ...authUsers.get(id) } as AdminProfile;
    })
    .filter(Boolean) as AdminProfile[];

  return {
    members,
    reviews: (reviews.data ?? []).map((row) => ({
      id: String(row.id),
      comment: row.comment,
      taste: row.taste,
      presentation: row.presentation,
      inserted_at: row.inserted_at,
      state: row.state,
      location: one(row.location),
      profile: one(row.profile),
      engagement: emptyReviewEngagement(),
    })),
    locations: (locations.data ?? []) as LatestLocation[],
  };
};

/**
 * Minimum reviews before a location can rank. Mirrors the app's Discover
 * list (components/DiscoverTabs.tsx) — one five-star review should not
 * outrank a well-reviewed bar.
 */
const TOP_LOCATION_MIN_RATINGS = 2;

/**
 * The leaderboard counterpart to fetchLatestActivity: most-reviewing members,
 * most-engaged reviews, most-reviewed locations. Likes and comments are
 * tallied in memory — fine at current scale, revisit alongside fetchAuthUsers.
 */
export const fetchTopActivity = async (limit = 10): Promise<TopActivity> => {
  const [members, activeMemberIds] = await Promise.all([
    fetchTopReviewers(limit),
    fetchActiveMemberIds(),
  ]);
  const activeLocationIds = await fetchActiveLocationIds(activeMemberIds);
  const [likes, comments, locationReviews] = await Promise.all([
    activeMemberIds.length > 0
      ? db().from("likes").select("review_id").in("user_id", activeMemberIds)
      : { data: [], error: null },
    activeMemberIds.length > 0
      ? db().from("comments").select("review_id").in("user_id", activeMemberIds)
      : { data: [], error: null },
    activeMemberIds.length > 0 && activeLocationIds.length > 0
      ? db()
          .from("reviews")
          .select(
            `location,taste,presentation,
             location_data:locations!reviews_location_fkey(id,name)`
          )
          .eq("state", 1)
          .in("user_id", activeMemberIds)
          .in("location", activeLocationIds)
      : { data: [], error: null },
  ]);
  if (likes.error) throw new Error(likes.error.message);
  if (comments.error) throw new Error(comments.error.message);
  if (locationReviews.error) throw new Error(locationReviews.error.message);

  const engagement = new Map<string, { likes: number; comments: number }>();
  const tally = (reviewId: unknown, key: "likes" | "comments") => {
    if (reviewId == null) return;
    const id = String(reviewId);
    const row = engagement.get(id) ?? { likes: 0, comments: 0 };
    row[key] += 1;
    engagement.set(id, row);
  };
  for (const row of likes.data ?? []) tally(row.review_id, "likes");
  for (const row of comments.data ?? []) tally(row.review_id, "comments");

  const ranked = [...engagement.entries()].sort(
    (a, b) =>
      b[1].likes - a[1].likes ||
      b[1].comments - a[1].comments ||
      Number(b[0]) - Number(a[0])
  );

  const topReviews: TopReview[] = [];
  for (
    let offset = 0;
    activeMemberIds.length > 0 &&
    activeLocationIds.length > 0 &&
    topReviews.length < limit &&
    offset < ranked.length;
    offset += limit * 4
  ) {
    const batch = ranked.slice(offset, offset + limit * 4);
    const { data, error } = await db()
      .from("reviews")
      .select(
        `id,comment,taste,presentation,inserted_at,state,
         location:locations!reviews_location_fkey(id,name),
         profile:profiles!reviews_user_id_fkey1(id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio)`
      )
      .eq("state", 1)
      .in("user_id", activeMemberIds)
      .in("location", activeLocationIds)
      .in(
        "id",
        batch.map(([id]) => id)
      );
    if (error) throw new Error(error.message);

    // Reordered to the engagement ranking, which `in` does not preserve.
    topReviews.push(
      ...(batch
        .map(([id, counts]) => {
          const row = (data ?? []).find((r) => String(r.id) === id);
          if (!row) return null;
          return {
            id: String(row.id),
            comment: row.comment,
            taste: row.taste,
            presentation: row.presentation,
            inserted_at: row.inserted_at,
            state: row.state,
            location: one(row.location),
            profile: one(row.profile),
            engagement: {
              likes: counts.likes,
              comments: counts.comments,
              shares: 0,
            },
            ...counts,
          };
        })
        .filter(Boolean) as TopReview[])
    );
  }

  const locationsById = new Map<
    number,
    {
      id: number;
      name: string | null;
      total_ratings: number;
      scored: number;
      score: number;
    }
  >();
  for (const review of locationReviews.data ?? []) {
    if (review.location == null) continue;
    const location = one(review.location_data);
    const id = Number(review.location);
    const row = locationsById.get(id) ?? {
      id,
      name: location?.name ?? null,
      total_ratings: 0,
      scored: 0,
      score: 0,
    };
    row.total_ratings += 1;
    if (review.taste != null && review.presentation != null) {
      row.scored += 1;
      row.score += (Number(review.taste) + Number(review.presentation)) / 2;
    }
    locationsById.set(id, row);
  }
  const topLocations = [...locationsById.values()]
    .map((location) => ({
      id: location.id,
      name: location.name,
      rating:
        location.scored > 0
          ? Math.round((location.score / location.scored) * 10) / 10
          : null,
      total_ratings: location.total_ratings,
    }))
    .filter(
      (location) =>
        location.total_ratings >= TOP_LOCATION_MIN_RATINGS &&
        location.rating != null
    )
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) || b.total_ratings - a.total_ratings
    )
    .slice(0, limit);

  return {
    members,
    reviews: topReviews.slice(0, limit),
    locations: topLocations,
  };
};

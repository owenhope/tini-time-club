import "server-only";
import { fetchWebMentionSpans } from "@/lib/mentions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchActiveMemberIds, USERS_PAGE_SIZE } from "@/lib/profileData";
import type {
  AdminReviewDetail,
  AdminReviewRow,
  ReviewCounts,
  ReviewEngagement,
} from "@/lib/reviewTypes";
import { emptyReviewEngagement } from "@/lib/reviewTypes";

export type {
  AdminReview,
  AdminReviewDetail,
  AdminReviewRow,
  ReviewCounts,
  ReviewEngagement,
  TopReview,
} from "@/lib/reviewTypes";

const db = supabaseAdmin;

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const isMissingRelationError = (
  error: { code?: string | null; message?: string | null } | null | undefined,
  relation: string
) => {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes(relation.toLowerCase()) &&
      (message.includes("does not exist") ||
        message.includes("could not find the table")))
  );
};

const fetchReviewEngagement = async (
  reviewIds: string[],
  activeMemberIds: string[]
): Promise<Map<string, ReviewEngagement>> => {
  const engagement = new Map(
    reviewIds.map((id) => [id, emptyReviewEngagement()] as const)
  );
  if (reviewIds.length === 0 || activeMemberIds.length === 0) {
    return engagement;
  }

  const [likes, comments, shares] = await Promise.all([
    db()
      .from("likes")
      .select("review_id")
      .in("review_id", reviewIds)
      .in("user_id", activeMemberIds),
    db()
      .from("comments")
      .select("review_id")
      .in("review_id", reviewIds)
      .in("user_id", activeMemberIds),
    db()
      .from("review_share_events")
      .select("review_id")
      .in("review_id", reviewIds)
      .in("user_id", activeMemberIds),
  ]);
  if (likes.error) throw new Error(likes.error.message);
  if (comments.error) throw new Error(comments.error.message);
  if (
    shares.error &&
    !isMissingRelationError(shares.error, "review_share_events")
  ) {
    throw new Error(shares.error.message);
  }

  const tally = (reviewId: unknown, key: keyof ReviewEngagement) => {
    if (reviewId == null) return;
    const row = engagement.get(String(reviewId));
    if (row) row[key] += 1;
  };
  for (const like of likes.data ?? []) tally(like.review_id, "likes");
  for (const comment of comments.data ?? []) {
    tally(comment.review_id, "comments");
  }
  const shareRows = shares.error ? [] : (shares.data ?? []);
  for (const share of shareRows) {
    tally(share.review_id, "shares");
  }

  return engagement;
};

export const fetchReviewCounts = async (): Promise<ReviewCounts> => {
  const [total, active] = await Promise.all([
    db().from("reviews").select("id", { count: "exact", head: true }),
    db()
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("state", 1),
  ]);
  if (total.error) throw new Error(total.error.message);
  if (active.error) throw new Error(active.error.message);
  const totalCount = total.count ?? 0;
  const activeCount = active.count ?? 0;
  return {
    total: totalCount,
    active: activeCount,
    inactive: Math.max(0, totalCount - activeCount),
  };
};

/** All reviews, newest first, for the admin Reviews section. */
export const fetchAllReviews = async (
  search?: string,
  page = 1,
  perPage = USERS_PAGE_SIZE,
  state?: "active" | "inactive"
): Promise<{ reviews: AdminReviewRow[]; total: number }> => {
  const offset = (Math.max(1, page) - 1) * perPage;
  const trimmedSearch = search?.trim();
  const usernameSearch = trimmedSearch?.replace(/^@+/, "");
  const [matchingProfileIds, matchingPlaceIds] = trimmedSearch
    ? await Promise.all([
        db()
          .from("profiles")
          .select("id")
          .ilike("username", `%${usernameSearch}%`)
          .then(({ data, error }) => {
            if (error) throw new Error(error.message);
            return (data ?? []).map((profile) => profile.id);
          }),
        db()
          .from("locations")
          .select("id")
          .or(`name.ilike.%${trimmedSearch}%,address.ilike.%${trimmedSearch}%`)
          .then(({ data, error }) => {
            if (error) throw new Error(error.message);
            return (data ?? []).map((place) => place.id);
          }),
      ])
    : [[], []];

  let query = db()
    .from("reviews")
    .select(
      `id,comment,taste,presentation,inserted_at,state,
       location:locations!reviews_location_fkey(id,name),
       profile:profiles!reviews_user_id_fkey1(id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio)`,
      { count: "exact" }
    )
    .order("inserted_at", { ascending: false })
    .range(offset, offset + perPage - 1);
  if (trimmedSearch) {
    const filters = [`comment.ilike.%${trimmedSearch}%`];
    if (matchingProfileIds.length > 0) {
      filters.push(`user_id.in.(${matchingProfileIds.join(",")})`);
    }
    if (matchingPlaceIds.length > 0) {
      filters.push(`location.in.(${matchingPlaceIds.join(",")})`);
    }
    query = query.or(filters.join(","));
  }
  if (state === "active") query = query.eq("state", 1);
  if (state === "inactive") query = query.neq("state", 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const reviewIds = (data ?? []).map((row) => String(row.id));
  const activeMemberIds = await fetchActiveMemberIds();
  const engagement = await fetchReviewEngagement(reviewIds, activeMemberIds);

  return {
    reviews: (data ?? []).map((row) => ({
      id: String(row.id),
      comment: row.comment,
      taste: row.taste,
      presentation: row.presentation,
      inserted_at: row.inserted_at,
      state: row.state,
      location: one(row.location),
      profile: one(row.profile),
      engagement: engagement.get(String(row.id)) ?? emptyReviewEngagement(),
    })),
    total: count ?? 0,
  };
};

export const fetchAdminReview = async (
  id: string
): Promise<AdminReviewDetail | null> => {
  if (!/^\d+$/.test(id)) return null;

  const activeMemberIds = await fetchActiveMemberIds();
  const [reviewResult, engagement] = await Promise.all([
    db()
      .from("reviews")
      .select(
        `id,image_url,comment,taste,presentation,inserted_at,state,
         location:locations!reviews_location_fkey(id,name,address),
         spirit:spirits(name),
         type:types(name),
         profile:profiles!reviews_user_id_fkey1(id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio)`
      )
      .eq("id", id)
      .maybeSingle(),
    fetchReviewEngagement([id], activeMemberIds),
  ]);
  const { data, error } = reviewResult;
  if (error) throw new Error(error.message);
  if (!data) return null;

  const mentionRows = await fetchWebMentionSpans({
    reviewIds: [id],
    audience: "admin",
  });

  const imageResult = data.image_url
    ? await db()
        .storage.from("review_images")
        .createSignedUrl(data.image_url, 60 * 60)
    : null;

  return {
    id: String(data.id),
    image_url: data.image_url,
    image_public_url: imageResult?.data?.signedUrl ?? null,
    comment: data.comment,
    taste: data.taste,
    presentation: data.presentation,
    inserted_at: data.inserted_at,
    state: data.state,
    location: one(data.location),
    spirit: one(data.spirit),
    type: one(data.type),
    profile: one(data.profile),
    engagement: engagement.get(id) ?? emptyReviewEngagement(),
    mentions: mentionRows.reviews.get(String(id)) ?? [],
  };
};

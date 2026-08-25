import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import { fetchWebMentionSpans } from "@/lib/mentions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { USERS_PAGE_SIZE } from "@/lib/profileData";
import type {
  AdminReviewDetail,
  AdminReviewRow,
  ReviewCounts,
  ReviewEngagement,
} from "@/lib/reviewTypes";
import { emptyReviewEngagement } from "@/lib/reviewTypes";
import { buildReviewEngagementFromCounts } from "@/lib/reviewModels";

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

const fetchReviewEngagement = async (
  reviewIds: string[]
): Promise<Map<string, ReviewEngagement>> => {
  if (reviewIds.length === 0) {
    return buildReviewEngagementFromCounts(reviewIds, {});
  }

  const { data, error } = await db().rpc("get_admin_review_engagement", {
    p_review_ids: reviewIds.map(Number),
  });
  if (error) throw toAdminDataError(error, "load review engagement");
  return buildReviewEngagementFromCounts(reviewIds, data);
};

export const fetchReviewCounts = async (): Promise<ReviewCounts> => {
  const [total, active] = await Promise.all([
    db().from("reviews").select("id", { count: "exact", head: true }),
    db()
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("state", 1),
  ]);
  if (total.error) throw toAdminDataError(total.error, "count reviews");
  if (active.error)
    throw toAdminDataError(active.error, "count active reviews");
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
            if (error) throw toAdminDataError(error, "search review profiles");
            return (data ?? []).map((profile) => profile.id);
          }),
        db()
          .from("locations")
          .select("id")
          .or(`name.ilike.%${trimmedSearch}%,address.ilike.%${trimmedSearch}%`)
          .then(({ data, error }) => {
            if (error) throw toAdminDataError(error, "search review places");
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
  if (error) throw toAdminDataError(error, "load reviews");
  const reviewIds = (data ?? []).map((row) => String(row.id));
  const engagement = await fetchReviewEngagement(reviewIds);

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
    fetchReviewEngagement([id]),
  ]);
  const { data, error } = reviewResult;
  if (error) throw toAdminDataError(error, "load review detail");
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

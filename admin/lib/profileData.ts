import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  AdminProfile,
  NotificationAudienceMember,
  ProfileCounts,
  ProfileSort,
  SortDirection,
} from "@/lib/profileTypes";
import type { AdminReview } from "@/lib/reviewTypes";
import { emptyReviewEngagement } from "@/lib/reviewTypes";

export type {
  AdminProfile,
  NotificationAudienceMember,
  ProfileCounts,
  ProfileSort,
  SortDirection,
} from "@/lib/profileTypes";

const db = supabaseAdmin;

export const USERS_PAGE_SIZE = 50;

export const fetchProfileCounts = async (): Promise<ProfileCounts> => {
  const [total, verified, deleted] = await Promise.all([
    db().from("profiles").select("id", { count: "exact", head: true }),
    db()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true),
    db()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("deleted", true),
  ]);
  if (total.error) throw toAdminDataError(total.error, "count profiles");
  if (verified.error)
    throw toAdminDataError(verified.error, "count verified profiles");
  if (deleted.error)
    throw toAdminDataError(deleted.error, "count deleted profiles");
  return {
    total: total.count ?? 0,
    verified: verified.count ?? 0,
    deleted: deleted.count ?? 0,
  };
};

export const fetchProfiles = async (
  search?: string,
  page = 1,
  perPage = USERS_PAGE_SIZE,
  status?: "active" | "deleted" | "verified",
  sort: ProfileSort = "review_count",
  direction: SortDirection = "desc"
): Promise<{ profiles: AdminProfile[]; total: number }> => {
  const sortColumn: ProfileSort = [
    "username",
    "rank",
    "review_count",
    "deleted",
    "created_at",
    "last_review_at",
  ].includes(sort)
    ? sort
    : "review_count";

  const { data, error } = await db().rpc("get_admin_profiles_page", {
    p_search: search ?? null,
    p_status: status ?? null,
    p_sort: sortColumn,
    p_direction: direction,
    p_page: page,
    p_per_page: perPage,
  });
  if (error) throw toAdminDataError(error, "load profiles");
  const result = (data ?? {}) as {
    profiles?: AdminProfile[];
    total?: number;
  };
  return {
    profiles: (result.profiles ?? []) as AdminProfile[],
    total: Number(result.total) || 0,
  };
};

export const fetchProfile = async (
  id: string
): Promise<{ profile: AdminProfile; reviews: AdminReview[] } | null> => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;

  const [
    { data: profileData, error: profileError },
    { data: reviews, error: reviewsError },
  ] = await Promise.all([
    db().rpc("get_admin_profile_detail", { p_id: id }),
    db()
      .from("reviews")
      .select(
        "id,comment,taste,presentation,inserted_at,state,location:locations!reviews_location_fkey(name)"
      )
      .eq("user_id", id)
      .order("inserted_at", { ascending: false })
      .limit(50),
  ]);
  if (profileError) throw toAdminDataError(profileError, "load profile detail");
  if (reviewsError)
    throw toAdminDataError(reviewsError, "load profile reviews");
  const profile = profileData as AdminProfile | null;
  if (!profile) return null;
  const reviewRows = (reviews ?? []) as Array<
    Omit<AdminReview, "location"> & {
      location: AdminReview["location"] | AdminReview["location"][];
    }
  >;
  return {
    profile,
    reviews: reviewRows.map((review) => ({
      ...review,
      location: Array.isArray(review.location)
        ? (review.location[0] ?? null)
        : review.location,
      engagement: emptyReviewEngagement(),
    })),
  };
};

export const fetchNotificationAudienceCount = async (): Promise<number> => {
  const { count, error } = await db()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("deleted", false);
  if (error) throw toAdminDataError(error, "count notification audience");
  return count ?? 0;
};

/** Search a small candidate set for the notification recipient picker. */
export const fetchNotificationAudienceMembers = async (
  search: string,
  limit = 20
): Promise<NotificationAudienceMember[]> => {
  const query = search.trim();
  if (query.length < 2) return [];

  const safeLimit = Math.max(1, Math.min(limit, 50));
  const pattern = `%${query}%`;
  const [usernameResult, nameResult] = await Promise.all([
    db()
      .from("profiles")
      .select("id,username,name")
      .eq("deleted", false)
      .ilike("username", pattern)
      .order("username", { ascending: true, nullsFirst: false })
      .limit(safeLimit),
    db()
      .from("profiles")
      .select("id,username,name")
      .eq("deleted", false)
      .ilike("name", pattern)
      .order("username", { ascending: true, nullsFirst: false })
      .limit(safeLimit),
  ]);
  if (usernameResult.error)
    throw toAdminDataError(
      usernameResult.error,
      "search notification audience"
    );
  if (nameResult.error)
    throw toAdminDataError(nameResult.error, "search notification audience");

  const members = new Map<string, NotificationAudienceMember>();
  for (const member of [
    ...(usernameResult.data ?? []),
    ...(nameResult.data ?? []),
  ]) {
    members.set(member.id, member);
  }
  return [...members.values()]
    .sort((a, b) =>
      (a.username ?? a.name ?? a.id).localeCompare(b.username ?? b.name ?? b.id)
    )
    .slice(0, safeLimit);
};

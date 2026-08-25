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
import { enrichAdminProfile, type AuthUserSummary } from "@/lib/profileModels";

export type {
  AdminProfile,
  NotificationAudienceMember,
  ProfileCounts,
  ProfileSort,
  SortDirection,
} from "@/lib/profileTypes";

const db = supabaseAdmin;

export const USERS_PAGE_SIZE = 50;

export const fetchActiveMemberIds = async (): Promise<string[]> => {
  const { data, error } = await db()
    .from("profiles")
    .select("id")
    .eq("deleted", false);
  if (error) throw toAdminDataError(error, "load active members");
  return (data ?? []).map((profile) => profile.id);
};

export const fetchActiveLocationIds = async (
  activeMemberIds: string[]
): Promise<number[]> => {
  if (activeMemberIds.length === 0) return [];

  const { data, error } = await db()
    .from("locations")
    .select("id")
    .in("created_by", activeMemberIds);
  if (error) throw toAdminDataError(error, "load active locations");
  return (data ?? []).map((location) => location.id);
};

/** auth.users rows keyed by id — email + signup date live there. */
export const fetchAuthUsers = async (): Promise<
  Map<string, AuthUserSummary>
> => {
  const users = new Map();
  let page = 1;
  // Paginate defensively; fine at current scale, revisit past ~10k users.
  for (;;) {
    const { data, error } = await db().auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw toAdminDataError(error, "load auth users");
    for (const user of data.users) {
      users.set(user.id, {
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      });
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return users;
};

/** Most-reviewing members, for the dashboard and analytics leaderboards. */
export const fetchTopReviewers = async (limit = 5): Promise<AdminProfile[]> => {
  const [{ data, error }, authUsers] = await Promise.all([
    db()
      .from("profiles")
      .select(
        "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
      )
      .eq("deleted", false)
      .order("review_count", { ascending: false })
      .limit(limit),
    fetchAuthUsers(),
  ]);
  if (error) throw toAdminDataError(error, "load top reviewers");
  return ((data ?? []) as AdminProfile[]).map((profile) =>
    enrichAdminProfile(profile, authUsers.get(profile.id))
  );
};

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
  const [{ data: profile, error }, authUsers, { data: reviews }] =
    await Promise.all([
      db()
        .from("profiles")
        .select(
          "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
        )
        .eq("id", id)
        .maybeSingle(),
      fetchAuthUsers(),
      db()
        .from("reviews")
        .select(
          "id,comment,taste,presentation,inserted_at,state,location:locations!reviews_location_fkey(name)"
        )
        .eq("user_id", id)
        .order("inserted_at", { ascending: false })
        .limit(50),
    ]);
  if (error) throw toAdminDataError(error, "load profile detail");
  if (!profile) return null;
  const reviewRows = (reviews ?? []) as Array<
    Omit<AdminReview, "location"> & {
      location: AdminReview["location"] | AdminReview["location"][];
    }
  >;
  return {
    profile: enrichAdminProfile(profile, authUsers.get(profile.id)),
    reviews: reviewRows.map((review) => ({
      ...review,
      location: Array.isArray(review.location)
        ? (review.location[0] ?? null)
        : review.location,
      engagement: emptyReviewEngagement(),
    })),
  };
};

export const fetchNotificationAudienceMembers = async (): Promise<
  NotificationAudienceMember[]
> => {
  const { data, error } = await db()
    .from("profiles")
    .select("id,username,name")
    .eq("deleted", false)
    .order("username", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) throw toAdminDataError(error, "load notification audience");

  return data ?? [];
};

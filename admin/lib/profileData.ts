import "server-only";
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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
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
  if (total.error) throw new Error(total.error.message);
  if (verified.error) throw new Error(verified.error.message);
  if (deleted.error) throw new Error(deleted.error.message);
  return {
    total: total.count ?? 0,
    verified: verified.count ?? 0,
    deleted: deleted.count ?? 0,
  };
};

const fetchLatestReviewDates = async (
  userIds: string[]
): Promise<Map<string, string>> => {
  const latest = new Map<string, string>();
  const idBatchSize = 200;
  const rowBatchSize = 1000;

  for (let index = 0; index < userIds.length; index += idBatchSize) {
    const ids = userIds.slice(index, index + idBatchSize);
    for (let start = 0; ; start += rowBatchSize) {
      const { data, error } = await db()
        .from("reviews")
        .select("user_id,inserted_at")
        .in("user_id", ids)
        .order("inserted_at", { ascending: false })
        .range(start, start + rowBatchSize - 1);
      if (error) throw new Error(error.message);

      for (const review of data ?? []) {
        if (!latest.has(review.user_id)) {
          latest.set(review.user_id, review.inserted_at);
        }
      }
      if ((data ?? []).length < rowBatchSize) break;
    }
  }

  return latest;
};

export const fetchProfiles = async (
  search?: string,
  page = 1,
  perPage = USERS_PAGE_SIZE,
  status?: "active" | "deleted" | "verified",
  sort: ProfileSort = "review_count",
  direction: SortDirection = "desc"
): Promise<{ profiles: AdminProfile[]; total: number }> => {
  const offset = (Math.max(1, page) - 1) * perPage;
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

  if (sortColumn === "created_at" || sortColumn === "last_review_at") {
    const authUsers = await fetchAuthUsers();
    const profiles: AdminProfile[] = [];
    const batchSize = 1000;
    let total = 0;

    for (let start = 0; ; start += batchSize) {
      let batchQuery = db()
        .from("profiles")
        .select(
          "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio",
          { count: "exact" }
        )
        .order("id", { ascending: true })
        .range(start, start + batchSize - 1);
      if (search) batchQuery = batchQuery.ilike("username", `%${search}%`);
      if (status === "active") batchQuery = batchQuery.eq("deleted", false);
      if (status === "deleted") batchQuery = batchQuery.eq("deleted", true);
      if (status === "verified")
        batchQuery = batchQuery.eq("is_verified", true);

      const { data, error, count } = await batchQuery;
      if (error) throw new Error(error.message);
      if (start === 0) total = count ?? 0;

      const batch = (data ?? []).map((profile) =>
        enrichAdminProfile(profile, authUsers.get(profile.id))
      );
      profiles.push(...batch);
      if (batch.length < batchSize) break;
    }

    const latestReviewDates = await fetchLatestReviewDates(
      profiles.map((profile) => profile.id)
    );
    for (const profile of profiles) {
      profile.last_review_at = latestReviewDates.get(profile.id);
    }

    profiles.sort((left, right) => {
      const leftValue = left[sortColumn];
      const rightValue = right[sortColumn];
      if (!leftValue && !rightValue) return left.id.localeCompare(right.id);
      if (!leftValue) return 1;
      if (!rightValue) return -1;
      const comparison =
        new Date(leftValue).getTime() - new Date(rightValue).getTime();
      return comparison === 0
        ? left.id.localeCompare(right.id)
        : direction === "asc"
          ? comparison
          : -comparison;
    });

    return {
      profiles: profiles.slice(offset, offset + perPage),
      total,
    };
  }

  const databaseSortColumn =
    sortColumn === "rank" ? "review_count" : sortColumn;
  let query = db()
    .from("profiles")
    .select(
      "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio",
      { count: "exact" }
    )
    .order(databaseSortColumn, {
      ascending: direction === "asc",
      nullsFirst: false,
    })
    .order("id", { ascending: true })
    .range(offset, offset + perPage - 1);
  if (search) query = query.ilike("username", `%${search}%`);
  if (status === "active") query = query.eq("deleted", false);
  if (status === "deleted") query = query.eq("deleted", true);
  if (status === "verified") query = query.eq("is_verified", true);

  const [{ data, error, count }, authUsers] = await Promise.all([
    query,
    fetchAuthUsers(),
  ]);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const latestReviewDates = await fetchLatestReviewDates(
    rows.map((profile) => profile.id)
  );
  return {
    profiles: rows.map((profile) => ({
      ...enrichAdminProfile(profile, authUsers.get(profile.id)),
      last_review_at: latestReviewDates.get(profile.id),
    })),
    total: count ?? 0,
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
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);

  return data ?? [];
};

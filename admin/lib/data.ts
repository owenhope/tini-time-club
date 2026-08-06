import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bucketByDay } from "@/lib/bucket";
import type { DateRange } from "@/lib/range";

export interface AdminProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  deleted: boolean | null;
  deleted_at: string | null;
  review_count: number | null;
  bio: string | null;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
}

export interface AdminReview {
  id: string | number;
  comment: string | null;
  taste: number | null;
  presentation: number | null;
  inserted_at: string;
  state: number | null;
  location: { name: string | null } | null;
}

export interface SharePreviewReview {
  id: string;
  comment: string | null;
  inserted_at: string;
  taste: number | null;
  presentation: number | null;
  location: { name: string | null } | null;
  profile: { username: string | null } | null;
}

const db = supabaseAdmin;

/** auth.users rows keyed by id — email + signup date live there. */
export const fetchAuthUsers = async (): Promise<
  Map<string, { email?: string; created_at?: string; last_sign_in_at?: string }>
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

export interface KpiMetric {
  /** All-time total, ignoring the selected range. */
  total: number;
  /** Added within the selected range. */
  current: number;
  /** Added within the equal-length window immediately before it. */
  previous: number;
  byDay: { day: string; count: number }[];
}

export interface DashboardKpis {
  users: KpiMetric;
  reviews: KpiMetric;
  locations: KpiMetric;
}

/** The equal-length window immediately preceding `range`. */
const previousWindow = (range: DateRange) => {
  const until = new Date(range.since.getTime() - 1);
  const since = new Date(range.since);
  since.setDate(since.getDate() - range.days);
  return { since, until };
};

const countBetween = (
  table: string,
  column: string,
  since: Date,
  until: Date,
  activeOnly = false
) => {
  // `*` rather than a named column: `likes` has no id, and head:true means
  // no rows come back regardless.
  let query = db()
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(column, since.toISOString())
    .lte(column, until.toISOString());
  if (activeOnly) query = query.eq("state", 1);
  return query;
};

/**
 * The three headline KPIs — members, reviews, locations — each as an all-time
 * total plus this-window and previous-window counts so the dashboard can show
 * growth without a second round of queries.
 *
 * Signup dates come from auth.users: `profiles` has no created_at column.
 */
export const fetchDashboardKpis = async (
  range: DateRange
): Promise<DashboardKpis> => {
  const prior = previousWindow(range);

  const [
    authUsers,
    activeMembers,
    totalReviews,
    totalLocations,
    reviewsInRange,
    locationsInRange,
    priorReviews,
    priorLocations,
  ] = await Promise.all([
    fetchAuthUsers(),
    db().from("profiles").select("id").eq("deleted", false),
    db()
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("state", 1),
    db().from("locations").select("id", { count: "exact", head: true }),
    db()
      .from("reviews")
      .select("inserted_at")
      .eq("state", 1)
      .gte("inserted_at", range.since.toISOString())
      .lte("inserted_at", range.until.toISOString()),
    db()
      .from("locations")
      .select("inserted_at")
      .gte("inserted_at", range.since.toISOString())
      .lte("inserted_at", range.until.toISOString()),
    countBetween("reviews", "inserted_at", prior.since, prior.until, true),
    countBetween("locations", "inserted_at", prior.since, prior.until),
  ]);

  if (activeMembers.error) throw new Error(activeMembers.error.message);
  const activeMemberIds = new Set(
    (activeMembers.data ?? []).map((profile) => profile.id)
  );
  const activeAuthUsers = [...authUsers.entries()]
    .filter(([id]) => activeMemberIds.has(id))
    .map(([, user]) => user);
  const signups = activeAuthUsers
    .map((user) => user.created_at)
    .filter(Boolean) as string[];
  const within = (from: Date, to: Date) =>
    signups.filter((ts) => {
      const at = new Date(ts).getTime();
      return at >= from.getTime() && at <= to.getTime();
    }).length;

  return {
    users: {
      total: activeMemberIds.size,
      current: within(range.since, range.until),
      previous: within(prior.since, prior.until),
      byDay: bucketByDay(signups, range.since, range.until),
    },
    reviews: {
      total: totalReviews.count ?? 0,
      current: (reviewsInRange.data ?? []).length,
      previous: priorReviews.count ?? 0,
      byDay: bucketByDay(
        (reviewsInRange.data ?? []).map((row) => row.inserted_at),
        range.since,
        range.until
      ),
    },
    locations: {
      total: totalLocations.count ?? 0,
      current: (locationsInRange.data ?? []).length,
      previous: priorLocations.count ?? 0,
      byDay: bucketByDay(
        (locationsInRange.data ?? []).map((row) => row.inserted_at),
        range.since,
        range.until
      ),
    },
  };
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
  return ((data ?? []) as AdminProfile[]).map((profile) => ({
    ...profile,
    ...authUsers.get(profile.id),
  }));
};

export interface AnalyticsData {
  signupsByDay: { day: string; count: number }[];
  reviewsByDay: { day: string; count: number }[];
  likesByDay: { day: string; count: number }[];
  commentsByDay: { day: string; count: number }[];
  sharesByDay: { day: string; count: number }[];
  invitesByDay: { day: string; count: number }[];
  activeLast7Days: number;
  activeLast30Days: number;
  /** Distinct members who reviewed within the selected range. */
  reviewedInRange: number;
  totalShares: number;
  totalInvites: number;
  shareChannels: { channel: string; count: number }[];
  inviteChannels: { channel: string; count: number }[];
  topSharers: (AdminProfile & {
    share_count: number;
    last_shared_at: string;
  })[];
  totalMembers: number;
  tierDistribution: {
    tier: string;
    color: string;
    count: number;
    /** Review count that earns the tier. */
    min: number;
    /** Last review count still inside the tier; null at the top. */
    max: number | null;
    /** The tier above, and the review count that reaches it. */
    next: { tier: string; min: number } | null;
  }[];
  topReviewers: AdminProfile[];
  /** Signups inside the range, for the growth section. */
  signupsInRange: number;
  /**
   * The same metrics over the equal-length window immediately before the
   * range, so every feature can be shown as progressing or regressing.
   */
  previous: {
    signups: number;
    reviews: number;
    likes: number;
    comments: number;
    shares: number;
    invites: number;
  };
}

/** The four in-app rank tiers, mirrored from utils/ranking.ts. */
const RANK_TIERS = [
  { name: "Well", min: 0, color: "#B4783A" },
  { name: "Call", min: 10, color: "#9BA6B2" },
  { name: "Premium", min: 50, color: "#D4AF37" },
  { name: "Top Shelf", min: 150, color: "#8E7CE8" },
];

export const fetchAnalytics = async (
  range: DateRange
): Promise<AnalyticsData> => {
  const sinceIso = range.since.toISOString();
  const untilIso = range.until.toISOString();

  const [
    authUsers,
    reviews,
    likes,
    comments,
    shares,
    celebrations,
    invites,
    profiles,
    reviewers,
  ] = await Promise.all([
    fetchAuthUsers(),
    db()
      .from("reviews")
      .select("inserted_at,user_id")
      .eq("state", 1)
      .gte("inserted_at", sinceIso)
      .lte("inserted_at", untilIso),
    db()
      .from("likes")
      .select("liked_at")
      .gte("liked_at", sinceIso)
      .lte("liked_at", untilIso),
    db()
      .from("comments")
      .select("inserted_at")
      .gte("inserted_at", sinceIso)
      .lte("inserted_at", untilIso),
    db()
      .from("review_share_events")
      .select("user_id,channel,outcome,shared_at")
      .gte("shared_at", sinceIso)
      .lte("shared_at", untilIso),
    db()
      .from("celebration_events")
      .select("user_id,kind,channel,outcome,created_at")
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso),
    db()
      .from("invite_share_events")
      .select("user_id,channel,outcome,created_at")
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso),
    db()
      .from("profiles")
      .select("id,review_count,deleted")
      .eq("deleted", false),
    fetchTopReviewers(10),
  ]);

  // Previous equal-length window, counts only — enough to say whether each
  // feature is progressing without pulling a second set of rows.
  const prior = previousWindow(range);
  const [priorReviews, priorLikes, priorComments, priorShares, priorInvites] =
    await Promise.all([
      countBetween("reviews", "inserted_at", prior.since, prior.until, true),
      countBetween("likes", "liked_at", prior.since, prior.until),
      countBetween("comments", "inserted_at", prior.since, prior.until),
      countBetween(
        "review_share_events",
        "shared_at",
        prior.since,
        prior.until
      ),
      countBetween(
        "invite_share_events",
        "created_at",
        prior.since,
        prior.until
      ),
    ]);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const authRows = [...authUsers.values()];
  const activeWithin = (windowDays: number) =>
    authRows.filter(
      (u) =>
        u.last_sign_in_at &&
        now - new Date(u.last_sign_in_at).getTime() < windowDays * dayMs
    ).length;

  const tierDistribution = RANK_TIERS.map((tier, index) => {
    const next = RANK_TIERS[index + 1];
    return {
      tier: tier.name,
      color: tier.color,
      count: (profiles.data ?? []).filter(
        (p) =>
          (p.review_count ?? 0) >= tier.min &&
          (!next || (p.review_count ?? 0) < next.min)
      ).length,
      min: tier.min,
      max: next ? next.min - 1 : null,
      next: next ? { tier: next.name, min: next.min } : null,
    };
  });

  const shareRows = shares.data ?? [];
  const celebrationRows = celebrations.data ?? [];
  const inviteRows = invites.data ?? [];
  const shareChannels = new Map<string, number>();
  const inviteChannels = new Map<string, number>();
  const sharesByUser = new Map<
    string,
    { count: number; last_shared_at: string }
  >();
  for (const share of shareRows) {
    const channel = share.channel ?? "unknown";
    shareChannels.set(channel, (shareChannels.get(channel) ?? 0) + 1);

    const current = sharesByUser.get(share.user_id);
    if (!current) {
      sharesByUser.set(share.user_id, {
        count: 1,
        last_shared_at: share.shared_at,
      });
    } else {
      current.count += 1;
      if (new Date(share.shared_at) > new Date(current.last_shared_at)) {
        current.last_shared_at = share.shared_at;
      }
    }
  }
  // Celebrations have no section of their own, but a milestone shared from
  // the celebration sheet is still a share — it counts toward Top sharers.
  for (const event of celebrationRows) {
    if (event.channel !== "sheet" || event.outcome !== "shared") continue;

    const sharer = sharesByUser.get(event.user_id);
    if (!sharer) {
      sharesByUser.set(event.user_id, {
        count: 1,
        last_shared_at: event.created_at,
      });
    } else {
      sharer.count += 1;
      if (new Date(event.created_at) > new Date(sharer.last_shared_at)) {
        sharer.last_shared_at = event.created_at;
      }
    }
  }
  for (const invite of inviteRows) {
    const channel = invite.channel ?? "unknown";
    inviteChannels.set(channel, (inviteChannels.get(channel) ?? 0) + 1);

    if (invite.outcome === "shared") {
      const current = sharesByUser.get(invite.user_id);
      if (!current) {
        sharesByUser.set(invite.user_id, {
          count: 1,
          last_shared_at: invite.created_at,
        });
      } else {
        current.count += 1;
        if (new Date(invite.created_at) > new Date(current.last_shared_at)) {
          current.last_shared_at = invite.created_at;
        }
      }
    }
  }
  const topShareEntries = [...sharesByUser.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  const { data: sharerProfiles } =
    topShareEntries.length > 0
      ? await db()
          .from("profiles")
          .select(
            "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
          )
          .in(
            "id",
            topShareEntries.map(([id]) => id)
          )
      : { data: [] };
  const sharerProfileMap = new Map(
    (sharerProfiles ?? []).map((profile) => [profile.id, profile])
  );

  return {
    signupsByDay: bucketByDay(
      authRows.map((u) => u.created_at),
      range.since,
      range.until
    ),
    reviewsByDay: bucketByDay(
      (reviews.data ?? []).map((r) => r.inserted_at),
      range.since,
      range.until
    ),
    likesByDay: bucketByDay(
      (likes.data ?? []).map((l) => l.liked_at),
      range.since,
      range.until
    ),
    commentsByDay: bucketByDay(
      (comments.data ?? []).map((c) => c.inserted_at),
      range.since,
      range.until
    ),
    sharesByDay: bucketByDay(
      shareRows.map((s) => s.shared_at),
      range.since,
      range.until
    ),
    invitesByDay: bucketByDay(
      inviteRows.map((invite) => invite.created_at),
      range.since,
      range.until
    ),
    activeLast7Days: activeWithin(7),
    activeLast30Days: activeWithin(30),
    reviewedInRange: new Set((reviews.data ?? []).map((r) => r.user_id)).size,
    totalShares: shareRows.length,
    totalInvites: inviteRows.length,
    shareChannels: [...shareChannels.entries()]
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    inviteChannels: [...inviteChannels.entries()]
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    topSharers: topShareEntries
      .map(([id, stats]) => {
        const profile = sharerProfileMap.get(id);
        if (!profile) return null;
        return {
          ...profile,
          ...authUsers.get(id),
          share_count: stats.count,
          last_shared_at: stats.last_shared_at,
        };
      })
      .filter(Boolean) as AnalyticsData["topSharers"],
    totalMembers: (profiles.data ?? []).length,
    tierDistribution,
    topReviewers: reviewers,
    signupsInRange: authRows.filter((user) => {
      if (!user.created_at) return false;
      const at = new Date(user.created_at).getTime();
      return at >= range.since.getTime() && at <= range.until.getTime();
    }).length,
    previous: {
      signups: authRows.filter((user) => {
        if (!user.created_at) return false;
        const at = new Date(user.created_at).getTime();
        return at >= prior.since.getTime() && at <= prior.until.getTime();
      }).length,
      reviews: priorReviews.count ?? 0,
      likes: priorLikes.count ?? 0,
      comments: priorComments.count ?? 0,
      shares: priorShares.count ?? 0,
      invites: priorInvites.count ?? 0,
    },
  };
};

export interface AdminNotification {
  id: string;
  created_at: string;
  body: string;
  kind: string | null;
  /** Username for single-recipient rows; null for grouped broadcasts. */
  username: string | null;
  recipients: number;
  opened: number;
}

export const NOTIFICATIONS_PAGE_SIZE = 50;

export const fetchRecentNotifications = async (
  page = 1,
  perPage = NOTIFICATIONS_PAGE_SIZE
): Promise<{ notifications: AdminNotification[]; total: number }> => {
  // notifications.user_id references auth.users, so there's no PostgREST
  // relationship to profiles — resolve usernames in a second query. Admin
  // broadcasts write one row per recipient sharing an
  // `admin:<broadcastId>:<userId>` event_key; collapse those into one entry
  // with recipient/open counts. Pagination happens over the *grouped* list,
  // so fetch a generous window of raw rows and slice after grouping —
  // revisit if raw volume outgrows this.
  const { data, error } = await db()
    .from("notifications")
    .select("id,created_at,body,kind,user_id,event_key")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const userIds = [...new Set((data ?? []).map((n) => n.user_id))];
  const notificationIds = (data ?? []).map((n) => n.id);
  const [{ data: profiles }, { data: opens }] = await Promise.all([
    db().from("profiles").select("id,username").in("id", userIds),
    db()
      .from("notification_opens")
      .select("notification_id")
      .in("notification_id", notificationIds),
  ]);
  const usernames = new Map(
    (profiles ?? []).map((p) => [p.id, p.username as string | null])
  );
  const openedIds = new Set(
    (opens ?? []).map((o) => o.notification_id as string)
  );

  const broadcastKey = (eventKey: string | null): string | null => {
    const match = eventKey?.match(/^admin:([0-9a-f-]{36}):/);
    return match ? match[1] : null;
  };

  const grouped = new Map<string, AdminNotification>();
  for (const n of data ?? []) {
    const key = broadcastKey(n.event_key) ?? n.id;
    const existing = grouped.get(key);
    if (existing) {
      existing.recipients += 1;
      existing.opened += openedIds.has(n.id) ? 1 : 0;
      existing.username = null; // more than one recipient
    } else {
      grouped.set(key, {
        id: key,
        created_at: n.created_at,
        body: n.body,
        kind: n.kind,
        username: usernames.get(n.user_id) ?? null,
        recipients: 1,
        opened: openedIds.has(n.id) ? 1 : 0,
      });
    }
  }
  const all = [...grouped.values()];
  const offset = (Math.max(1, page) - 1) * perPage;
  return {
    notifications: all.slice(offset, offset + perPage),
    total: all.length,
  };
};

export interface NotificationKindStats {
  kind: string;
  sent: number;
  opened: number;
  /** null when sends aren't tracked server-side (local reminders). */
  openRate: number | null;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalOpened: number;
  /** % of opens followed by a review from that member within 24h. */
  openToReviewRate: number | null;
  byKind: NotificationKindStats[];
}

export const fetchNotificationAnalytics = async (
  days = 30
): Promise<NotificationAnalytics> => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const [sent, opens, reviews] = await Promise.all([
    db().from("notifications").select("kind").gte("created_at", sinceIso),
    db()
      .from("notification_opens")
      .select("kind,user_id,opened_at")
      .gte("opened_at", sinceIso),
    db()
      .from("reviews")
      .select("user_id,inserted_at")
      .eq("state", 1)
      .gte("inserted_at", sinceIso),
  ]);

  const sentByKind = new Map<string, number>();
  for (const row of sent.data ?? []) {
    const kind = row.kind ?? "unknown";
    sentByKind.set(kind, (sentByKind.get(kind) ?? 0) + 1);
  }
  const openedByKind = new Map<string, number>();
  for (const row of opens.data ?? []) {
    const kind = row.kind ?? "unknown";
    openedByKind.set(kind, (openedByKind.get(kind) ?? 0) + 1);
  }

  const kinds = [
    ...new Set([...sentByKind.keys(), ...openedByKind.keys()]),
  ].sort();
  const byKind = kinds.map((kind) => {
    const sentCount = sentByKind.get(kind) ?? 0;
    const openedCount = openedByKind.get(kind) ?? 0;
    return {
      kind,
      sent: sentCount,
      opened: openedCount,
      openRate: sentCount > 0 ? openedCount / sentCount : null,
    };
  });

  // Conversion: an open counts if that member posted a review within 24h.
  const dayMs = 24 * 60 * 60 * 1000;
  const reviewsByUser = new Map<string, number[]>();
  for (const review of reviews.data ?? []) {
    const times = reviewsByUser.get(review.user_id) ?? [];
    times.push(new Date(review.inserted_at).getTime());
    reviewsByUser.set(review.user_id, times);
  }
  const openRows = opens.data ?? [];
  const converted = openRows.filter((open) => {
    const openedAt = new Date(open.opened_at).getTime();
    return (reviewsByUser.get(open.user_id) ?? []).some(
      (t) => t >= openedAt && t <= openedAt + dayMs
    );
  }).length;

  return {
    totalSent: (sent.data ?? []).length,
    totalOpened: openRows.length,
    openToReviewRate: openRows.length > 0 ? converted / openRows.length : null,
    byKind,
  };
};

export const fetchPushTokenCount = async (): Promise<number> => {
  const { count } = await db()
    .from("push_tokens")
    .select("expo_push_token", { count: "exact", head: true });
  return count ?? 0;
};

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

export const USERS_PAGE_SIZE = 50;

export type ProfileSort =
  | "username"
  | "rank"
  | "review_count"
  | "deleted"
  | "created_at"
  | "last_sign_in_at";
export type SortDirection = "asc" | "desc";

export interface ProfileCounts {
  total: number;
  verified: number;
  deleted: number;
}

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
    "last_sign_in_at",
  ].includes(sort)
    ? sort
    : "review_count";

  if (sortColumn === "created_at" || sortColumn === "last_sign_in_at") {
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

      const batch = (data ?? []).map((profile) => ({
        ...profile,
        ...authUsers.get(profile.id),
      }));
      profiles.push(...batch);
      if (batch.length < batchSize) break;
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
  return {
    profiles: (data ?? []).map((profile) => ({
      ...profile,
      ...authUsers.get(profile.id),
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
    profile: { ...profile, ...authUsers.get(profile.id) },
    reviews: reviewRows.map((review) => ({
      ...review,
      location: Array.isArray(review.location)
        ? (review.location[0] ?? null)
        : review.location,
    })),
  };
};

export interface AdminReviewRow {
  id: string;
  comment: string | null;
  taste: number | null;
  presentation: number | null;
  inserted_at: string;
  state: number | null;
  location: { id: number; name: string | null } | null;
  profile: AdminProfile | null;
}

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

export interface ReviewCounts {
  total: number;
  active: number;
  inactive: number;
}

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
  if (search) query = query.ilike("comment", `%${search}%`);
  if (state === "active") query = query.eq("state", 1);
  if (state === "inactive") query = query.neq("state", 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

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
    })),
    total: count ?? 0,
  };
};

export interface AdminLocation {
  id: number;
  name: string | null;
  address: string | null;
  rating: number | null;
  total_ratings: number;
}

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

/**
 * The newest members, reviews and locations, for the dashboard's three
 * recent-activity lists. Signup order comes from auth.users, since profiles
 * has no created_at.
 */
export const fetchLatestActivity = async (
  limit = 10
): Promise<LatestActivity> => {
  const [authUsers, reviews, locations] = await Promise.all([
    fetchAuthUsers(),
    fetchAllReviews(undefined, 1, limit),
    db()
      .from("locations")
      .select("id,name,address,inserted_at")
      .order("inserted_at", { ascending: false, nullsFirst: false })
      .limit(limit),
  ]);
  if (locations.error) throw new Error(locations.error.message);

  const newestIds = [...authUsers.entries()]
    .sort(
      (a, b) =>
        new Date(b[1].created_at ?? 0).getTime() -
        new Date(a[1].created_at ?? 0).getTime()
    )
    .slice(0, limit)
    .map(([id]) => id);

  const { data: newestProfiles, error: profileError } = await db()
    .from("profiles")
    .select(
      "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
    )
    .in("id", newestIds);
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
    reviews: reviews.reviews,
    locations: (locations.data ?? []) as LatestLocation[],
  };
};

export interface TopReview extends AdminReviewRow {
  likes: number;
  comments: number;
}

export interface TopLocation {
  id: number;
  name: string | null;
  rating: number | null;
  total_ratings: number;
}

/**
 * Minimum reviews before a location can rank. Mirrors the app's Discover
 * list (components/DiscoverTabs.tsx) — one five-star review should not
 * outrank a well-reviewed bar.
 */
const TOP_LOCATION_MIN_RATINGS = 2;

export interface TopActivity {
  members: AdminProfile[];
  reviews: TopReview[];
  locations: TopLocation[];
}

/**
 * The leaderboard counterpart to fetchLatestActivity: most-reviewing members,
 * most-engaged reviews, most-reviewed locations. Likes and comments are
 * tallied in memory — fine at current scale, revisit alongside fetchAuthUsers.
 */
export const fetchTopActivity = async (limit = 10): Promise<TopActivity> => {
  const [members, likes, comments, locations] = await Promise.all([
    fetchTopReviewers(limit),
    db().from("likes").select("review_id"),
    db().from("comments").select("review_id"),
    // Ranked exactly as the app's Discover list: highest rated first, review
    // count only as the tiebreaker, and nothing under the minimum sample.
    db()
      .from("location_ratings")
      .select("id,name,rating,total_ratings")
      .gte("total_ratings", TOP_LOCATION_MIN_RATINGS)
      .not("rating", "is", null)
      .order("rating", { ascending: false })
      .order("total_ratings", { ascending: false })
      .limit(limit),
  ]);
  if (likes.error) throw new Error(likes.error.message);
  if (comments.error) throw new Error(comments.error.message);
  if (locations.error) throw new Error(locations.error.message);

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

  const ranked = [...engagement.entries()]
    .sort(
      (a, b) =>
        b[1].likes - a[1].likes ||
        b[1].comments - a[1].comments ||
        Number(b[0]) - Number(a[0])
    )
    .slice(0, limit);

  let topReviews: TopReview[] = [];
  if (ranked.length > 0) {
    const { data, error } = await db()
      .from("reviews")
      .select(
        `id,comment,taste,presentation,inserted_at,state,
         location:locations!reviews_location_fkey(id,name),
         profile:profiles!reviews_user_id_fkey1(id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio)`
      )
      .in(
        "id",
        ranked.map(([id]) => id)
      );
    if (error) throw new Error(error.message);

    // Reordered to the engagement ranking, which `in` does not preserve.
    topReviews = ranked
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
          ...counts,
        };
      })
      .filter(Boolean) as TopReview[];
  }

  return {
    members,
    reviews: topReviews,
    locations: (locations.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      rating: row.rating ?? null,
      total_ratings: row.total_ratings ?? 0,
    })),
  };
};

export interface LocationCounts {
  total: number;
  rated: number;
  strong: number;
}

export const fetchLocationCounts = async (): Promise<LocationCounts> => {
  const [total, rated, strong] = await Promise.all([
    db().from("locations").select("id", { count: "exact", head: true }),
    db()
      .from("location_ratings")
      .select("id", { count: "exact", head: true })
      .gte("total_ratings", 1),
    db()
      .from("location_ratings")
      .select("id", { count: "exact", head: true })
      .gte("total_ratings", 5),
  ]);
  if (total.error) throw new Error(total.error.message);
  if (rated.error) throw new Error(rated.error.message);
  if (strong.error) throw new Error(strong.error.message);
  return {
    total: total.count ?? 0,
    rated: rated.count ?? 0,
    strong: strong.count ?? 0,
  };
};

/** All locations with their aggregate rating, for the admin Locations section. */
export const fetchLocations = async (
  search?: string,
  page = 1,
  perPage = USERS_PAGE_SIZE,
  minReviews = 0
): Promise<{ locations: AdminLocation[]; total: number }> => {
  const offset = (Math.max(1, page) - 1) * perPage;
  let query = db()
    .from("locations")
    .select("id,name,address", { count: "exact" })
    .order("name", { ascending: true });
  if (minReviews <= 0) query = query.range(offset, offset + perPage - 1);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const ratings = new Map<number, { rating: number | null; total: number }>();
  if (ids.length > 0) {
    const { data: ratingRows, error: ratingError } = await db()
      .from("location_ratings")
      .select("id,rating,total_ratings")
      .in("id", ids);
    if (ratingError) throw new Error(ratingError.message);
    for (const row of ratingRows ?? []) {
      ratings.set(row.id, {
        rating: row.rating ?? null,
        total: row.total_ratings ?? 0,
      });
    }
  }

  const locations = rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    rating: ratings.get(row.id)?.rating ?? null,
    total_ratings: ratings.get(row.id)?.total ?? 0,
  }));
  const filtered =
    minReviews > 0
      ? locations.filter((location) => location.total_ratings >= minReviews)
      : locations;

  return {
    locations:
      minReviews > 0 ? filtered.slice(offset, offset + perPage) : filtered,
    total: minReviews > 0 ? filtered.length : (count ?? 0),
  };
};

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

export interface DashboardStats {
  totalUsers: number;
  totalReviews: number;
  totalLocations: number;
  reviewsByDay: { day: string; count: number }[];
  topLocations: {
    id: number;
    name: string;
    rating: number;
    total_ratings: number;
  }[];
  newestUsers: AdminProfile[];
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

export const fetchDashboardStats = async (
  range: DateRange
): Promise<DashboardStats> => {
  const [users, reviews, locations, recentReviews, topLocations, authUsers] =
    await Promise.all([
      db()
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("deleted", false),
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
        .from("location_ratings")
        .select("id,name,rating,total_ratings")
        .gt("total_ratings", 0)
        .order("total_ratings", { ascending: false })
        .order("rating", { ascending: false })
        .limit(5),
      fetchAuthUsers(),
    ]);

  const newestIds = [...authUsers.entries()]
    .sort(
      (a, b) =>
        new Date(b[1].created_at ?? 0).getTime() -
        new Date(a[1].created_at ?? 0).getTime()
    )
    .slice(0, 5)
    .map(([id]) => id);
  const { data: newestProfiles } = await db()
    .from("profiles")
    .select(
      "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
    )
    .in("id", newestIds);
  const newestUsers = newestIds
    .map((id) => {
      const profile = (newestProfiles ?? []).find((p) => p.id === id);
      if (!profile) return null;
      return { ...profile, ...authUsers.get(id) } as AdminProfile;
    })
    .filter(Boolean) as AdminProfile[];

  return {
    totalUsers: users.count ?? 0,
    totalReviews: reviews.count ?? 0,
    totalLocations: locations.count ?? 0,
    reviewsByDay: bucketByDay(
      (recentReviews.data ?? []).map((r) => r.inserted_at),
      range.since,
      range.until
    ),
    topLocations: (topLocations.data ?? []) as DashboardStats["topLocations"],
    newestUsers,
  };
};

/** Most-reviewing members, for the dashboard and analytics leaderboards. */
export const fetchTopReviewers = async (
  limit = 5
): Promise<AdminProfile[]> => {
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
  profileSharesByDay: { day: string; count: number }[];
  celebrationsByDay: { day: string; count: number }[];
  invitesByDay: { day: string; count: number }[];
  activeLast7Days: number;
  activeLast30Days: number;
  /** Distinct members who reviewed within the selected range. */
  reviewedInRange: number;
  totalShares: number;
  totalProfileShares: number;
  totalCelebrations: number;
  celebrationShares: number;
  totalInvites: number;
  shareChannels: { channel: string; count: number }[];
  profileShareChannels: { channel: string; count: number }[];
  inviteChannels: { channel: string; count: number }[];
  celebrationKinds: { kind: string; count: number; shares: number }[];
  topSharers: (AdminProfile & { share_count: number; last_shared_at: string })[];
  totalMembers: number;
  tierDistribution: { tier: string; color: string; count: number }[];
  topReviewers: AdminProfile[];
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
    profileShares,
    celebrations,
    invites,
    profiles,
    reviewers,
  ] =
    await Promise.all([
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
        .from("profile_share_events")
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
    };
  });

  const shareRows = shares.data ?? [];
  const profileShareRows = profileShares.data ?? [];
  const celebrationRows = celebrations.data ?? [];
  const inviteRows = invites.data ?? [];
  const shareChannels = new Map<string, number>();
  const profileShareChannels = new Map<string, number>();
  const inviteChannels = new Map<string, number>();
  const celebrationKinds = new Map<string, { count: number; shares: number }>();
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
  for (const share of profileShareRows) {
    const channel = share.channel ?? "unknown";
    profileShareChannels.set(
      channel,
      (profileShareChannels.get(channel) ?? 0) + 1
    );

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
  for (const event of celebrationRows) {
    const kind = event.kind ?? "unknown";
    const current = celebrationKinds.get(kind) ?? { count: 0, shares: 0 };
    if (event.outcome === "shown") current.count += 1;
    if (event.channel === "sheet" && event.outcome === "shared") {
      current.shares += 1;

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
    celebrationKinds.set(kind, current);
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
    profileSharesByDay: bucketByDay(
      profileShareRows.map((s) => s.shared_at),
      range.since,
      range.until
    ),
    celebrationsByDay: bucketByDay(
      celebrationRows
        .filter((event) => event.outcome === "shown")
        .map((event) => event.created_at),
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
    totalProfileShares: profileShareRows.length,
    totalCelebrations: celebrationRows.filter(
      (event) => event.outcome === "shown"
    ).length,
    celebrationShares: celebrationRows.filter(
      (event) => event.channel === "sheet" && event.outcome === "shared"
    ).length,
    totalInvites: inviteRows.length,
    shareChannels: [...shareChannels.entries()]
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    profileShareChannels: [...profileShareChannels.entries()]
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    inviteChannels: [...inviteChannels.entries()]
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    celebrationKinds: [...celebrationKinds.entries()]
      .map(([kind, stats]) => ({ kind, ...stats }))
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
        | SharePreviewReview["location"]
        | SharePreviewReview["location"][];
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

export const fetchProfiles = async (
  search?: string,
  page = 1,
  perPage = USERS_PAGE_SIZE
): Promise<{ profiles: AdminProfile[]; total: number }> => {
  const offset = (Math.max(1, page) - 1) * perPage;
  let query = db()
    .from("profiles")
    .select(
      "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio",
      { count: "exact" }
    )
    .order("review_count", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + perPage - 1);
  if (search) query = query.ilike("username", `%${search}%`);

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

import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveAudienceUsageResponse } from "@/lib/audienceUsage.mjs";
import { resolveProductTelemetryResponse } from "@/lib/productTelemetry.mjs";
import { resolveLiveActivityResponse } from "@/lib/liveActivity.mjs";
import { bucketByDay } from "@/lib/bucket";
import { isAnalyticsNotificationKind } from "@/lib/notificationKinds";
import { formatCityRegion } from "@/lib/format";
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
  last_review_at?: string;
}

export interface NotificationAudienceMember {
  id: string;
  username: string | null;
  name: string | null;
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

export interface SharePreviewLocation {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  total_ratings: number;
}

const db = supabaseAdmin;

const fetchActiveMemberIds = async (): Promise<string[]> => {
  const { data, error } = await db()
    .from("profiles")
    .select("id")
    .eq("deleted", false);
  if (error) throw new Error(error.message);
  return (data ?? []).map((profile) => profile.id);
};

const fetchActiveLocationIds = async (
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

export interface AudienceUsage {
  available: boolean;
  visitorActiveNow: number;
  memberActiveNow: number;
  visitorInRange: number;
  memberInRange: number;
  convertedInRange: number;
  visitorByDay: { day: string; count: number }[];
  memberByDay: { day: string; count: number }[];
}

/**
 * Anonymous figures are distinct random installations, not inferred people.
 * Authenticated figures can safely deduplicate by member account. "Active now"
 * means a heartbeat was received in the last 15 minutes.
 */
export const fetchAudienceUsage = async (
  range: DateRange
): Promise<AudienceUsage> => {
  const activeSince = new Date(Date.now() - 15 * 60 * 1000);
  const { data, error } = await db().rpc("get_app_usage_summary", {
    p_since: range.since.toISOString().slice(0, 10),
    p_until: range.until.toISOString().slice(0, 10),
    p_active_since: activeSince.toISOString(),
  });
  return resolveAudienceUsageResponse(data, error);
};

export type LiveActivityTone = "green" | "purple" | "red" | "muted";

export interface LiveActivityEvent {
  id: string;
  occurredAt: string;
  action: string;
  category: string;
  tone: LiveActivityTone;
  actorId: string | null;
  actor: string;
  platform: string;
  appVersion: string;
  appEnvironment: string;
}

export interface LiveActivity {
  available: boolean;
  events: LiveActivityEvent[];
}

/**
 * Recent allowlisted product events for the operator feed. The resolver strips
 * installation and session identifiers before rows reach the page.
 */
export const fetchLiveActivity = async (
  limit = 60,
  hours = 24
): Promise<LiveActivity> => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await db()
    .from("app_analytics_events")
    .select(
      "id,event_name,user_id,platform,app_version,app_environment,occurred_at"
    )
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  const initial = resolveLiveActivityResponse(data, error);
  if (!initial.available || initial.events.length === 0) return initial;

  const userIds = [
    ...new Set((data ?? []).map((event) => event.user_id).filter(Boolean)),
  ];
  const profilesResult =
    userIds.length > 0
      ? await db().from("profiles").select("id,username,name").in("id", userIds)
      : { data: [], error: null };
  if (profilesResult.error) throw new Error(profilesResult.error.message);

  return resolveLiveActivityResponse(data, null, profilesResult.data ?? []);
};

export interface ProductTelemetry {
  available: boolean;
  trackedInstallations: number;
  versions: { version: string; installations: number; share: number }[];
  retention: {
    eligibleInstallations: number;
    returnedInstallations: number;
    rate: number | null;
  };
  authHealth: {
    unexpectedSignOuts: number;
    sessionMissingAtLaunch: number;
    affectedInstallations: number;
    issueRate: number | null;
  };
}

export const fetchProductTelemetry = async (
  range: DateRange
): Promise<ProductTelemetry> => {
  const { data, error } = await db().rpc("get_product_analytics_summary", {
    p_since: range.since.toISOString().slice(0, 10),
    p_until: range.until.toISOString().slice(0, 10),
  });
  return resolveProductTelemetryResponse(data, error);
};

/** The equal-length window immediately preceding `range`. */
const previousWindow = (range: DateRange) => {
  const until = new Date(range.since.getTime() - 1);
  const since = new Date(range.since);
  since.setDate(since.getDate() - range.days);
  return { since, until };
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

  const [authUsers, activeMemberIds] = await Promise.all([
    fetchAuthUsers(),
    fetchActiveMemberIds(),
  ]);

  const activeMemberIdSet = new Set(activeMemberIds);
  const activeLocationIds = await fetchActiveLocationIds(activeMemberIds);
  const noRows = { data: [], count: 0, error: null };
  const [
    totalReviews,
    totalLocations,
    reviewsInRange,
    locationsInRange,
    priorReviews,
    priorLocations,
  ] = await Promise.all([
    activeMemberIds.length > 0 && activeLocationIds.length > 0
      ? db()
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("state", 1)
          .in("user_id", activeMemberIds)
          .in("location", activeLocationIds)
      : noRows,
    activeMemberIds.length > 0
      ? db()
          .from("locations")
          .select("id", { count: "exact", head: true })
          .in("created_by", activeMemberIds)
      : noRows,
    activeMemberIds.length > 0 && activeLocationIds.length > 0
      ? db()
          .from("reviews")
          .select("inserted_at")
          .eq("state", 1)
          .in("user_id", activeMemberIds)
          .in("location", activeLocationIds)
          .gte("inserted_at", range.since.toISOString())
          .lte("inserted_at", range.until.toISOString())
      : noRows,
    activeMemberIds.length > 0
      ? db()
          .from("locations")
          .select("inserted_at")
          .in("created_by", activeMemberIds)
          .gte("inserted_at", range.since.toISOString())
          .lte("inserted_at", range.until.toISOString())
      : noRows,
    activeMemberIds.length > 0 && activeLocationIds.length > 0
      ? db()
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("state", 1)
          .in("user_id", activeMemberIds)
          .in("location", activeLocationIds)
          .gte("inserted_at", prior.since.toISOString())
          .lte("inserted_at", prior.until.toISOString())
      : noRows,
    activeMemberIds.length > 0
      ? db()
          .from("locations")
          .select("*", { count: "exact", head: true })
          .in("created_by", activeMemberIds)
          .gte("inserted_at", prior.since.toISOString())
          .lte("inserted_at", prior.until.toISOString())
      : noRows,
  ]);

  if (totalReviews.error) throw new Error(totalReviews.error.message);
  if (totalLocations.error) throw new Error(totalLocations.error.message);
  if (reviewsInRange.error) throw new Error(reviewsInRange.error.message);
  if (locationsInRange.error) throw new Error(locationsInRange.error.message);
  if (priorReviews.error) throw new Error(priorReviews.error.message);
  if (priorLocations.error) throw new Error(priorLocations.error.message);

  const activeAuthUsers = [...authUsers.entries()]
    .filter(([id]) => activeMemberIdSet.has(id))
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
      total: activeMemberIdSet.size,
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

/** The four in-app rank tiers, mirrored from utils/ranking.ts. */
const RANK_TIERS = [
  { name: "Well", min: 0, color: "#B4783A" },
  { name: "Call", min: 10, color: "#9BA6B2" },
  { name: "Premium", min: 50, color: "#D4AF37" },
  { name: "Top Shelf", min: 150, color: "#8E7CE8" },
];

export interface TierDistributionRow {
  tier: string;
  color: string;
  count: number;
  /** Review count that earns the tier. */
  min: number;
  /** Last review count still inside the tier; null at the top. */
  max: number | null;
  /** The tier above, and the review count that reaches it. */
  next: { tier: string; min: number } | null;
}

const tierDistributionFromProfiles = (
  profiles: { review_count: number | null }[]
): TierDistributionRow[] =>
  RANK_TIERS.map((tier, index) => {
    const next = RANK_TIERS[index + 1];
    return {
      tier: tier.name,
      color: tier.color,
      count: profiles.filter(
        (p) =>
          (p.review_count ?? 0) >= tier.min &&
          (!next || (p.review_count ?? 0) < next.min)
      ).length,
      min: tier.min,
      max: next ? next.min - 1 : null,
      next: next ? { tier: next.name, min: next.min } : null,
    };
  });

export const fetchTierDistribution = async (): Promise<
  TierDistributionRow[]
> => {
  const { data, error } = await db()
    .from("profiles")
    .select("review_count")
    .eq("deleted", false);
  if (error) throw new Error(error.message);

  return tierDistributionFromProfiles(data ?? []);
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

export type ModerationContentType = "review" | "comment";
export type ModerationStatus =
  "pending" | "reviewed" | "resolved" | "dismissed";

export interface ModerationReport {
  id: string;
  created_at: string;
  reason: string;
  status: ModerationStatus;
  content_type: ModerationContentType;
  review_id: number | null;
  comment_id: number | null;
  content_snapshot: Record<string, unknown>;
  reporter: AdminProfile | null;
  creator: AdminProfile | null;
  review: {
    id: number;
    comment: string | null;
    state: number | null;
    location: { name: string | null } | null;
  } | null;
  comment: { id: number; body: string } | null;
}

export interface ModerationReportCounts {
  total: number;
  pending: number;
  reviews: number;
  comments: number;
}

const reportSnapshot = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const fetchModerationReports = async ({
  query,
  status,
  contentType,
  page,
  perPage,
}: {
  query?: string;
  status?: ModerationStatus;
  contentType?: ModerationContentType;
  page: number;
  perPage: number;
}): Promise<{ reports: ModerationReport[]; total: number }> => {
  let request = db()
    .from("reports")
    .select(
      "id,reporter_id,review_id,comment_id,creator_id,reason,created_at,status,content_type,content_snapshot"
    )
    .limit(2000);
  if (status) request = request.eq("status", status);
  if (contentType) request = request.eq("content_type", contentType);

  const { data: reportRows, error } = await request;
  if (error) throw new Error(error.message);

  const rows = reportRows ?? [];
  const profileIds = [
    ...new Set(
      rows
        .flatMap((report) => [report.reporter_id, report.creator_id])
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const reviewIds = [
    ...new Set(
      rows
        .map((report) => report.review_id)
        .filter((id): id is number => id != null)
    ),
  ];
  const commentIds = [
    ...new Set(
      rows
        .map((report) => report.comment_id)
        .filter((id): id is number => id != null)
    ),
  ];

  const [profilesResult, reviewsResult, commentsResult] = await Promise.all([
    profileIds.length > 0
      ? db()
          .from("profiles")
          .select(
            "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
          )
          .in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    reviewIds.length > 0
      ? db()
          .from("reviews")
          .select(
            "id,comment,state,location:locations!reviews_location_fkey(name)"
          )
          .in("id", reviewIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length > 0
      ? db().from("comments").select("id,body").in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (commentsResult.error) throw new Error(commentsResult.error.message);

  const profiles = new Map(
    ((profilesResult.data ?? []) as AdminProfile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );
  const reviews = new Map(
    (reviewsResult.data ?? []).map((review) => [
      review.id,
      {
        id: review.id,
        comment: review.comment,
        state: review.state,
        location: Array.isArray(review.location)
          ? (review.location[0] ?? null)
          : review.location,
      },
    ])
  );
  const comments = new Map(
    (commentsResult.data ?? []).map((comment) => [comment.id, comment])
  );

  const normalized = rows.map((report) => ({
    id: report.id,
    created_at: report.created_at,
    reason: report.reason,
    status: (report.status ?? "pending") as ModerationStatus,
    content_type: (report.content_type ??
      (report.comment_id ? "comment" : "review")) as ModerationContentType,
    review_id: report.review_id,
    comment_id: report.comment_id,
    content_snapshot: reportSnapshot(report.content_snapshot),
    reporter: profiles.get(report.reporter_id) ?? null,
    creator: profiles.get(report.creator_id) ?? null,
    review: report.review_id ? (reviews.get(report.review_id) ?? null) : null,
    comment: report.comment_id
      ? (comments.get(report.comment_id) ?? null)
      : null,
  })) satisfies ModerationReport[];

  const needle = query?.trim().toLowerCase();
  const filtered = needle
    ? normalized.filter((report) => {
        const snapshotText = Object.values(report.content_snapshot)
          .filter((value) => typeof value === "string")
          .join(" ");
        return [
          report.reason,
          report.reporter?.username,
          report.reporter?.name,
          report.creator?.username,
          report.creator?.name,
          report.comment?.body,
          report.review?.comment,
          report.review?.location?.name,
          snapshotText,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
    : normalized;

  filtered.sort((left, right) => {
    const pendingOrder =
      Number(right.status === "pending") - Number(left.status === "pending");
    return (
      pendingOrder ||
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });

  const offset = (Math.max(1, page) - 1) * perPage;
  return {
    reports: filtered.slice(offset, offset + perPage),
    total: filtered.length,
  };
};

export const fetchModerationReportCounts =
  async (): Promise<ModerationReportCounts> => {
    const { data, error } = await db()
      .from("reports")
      .select("status,content_type,comment_id");
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((report) => report.status === "pending").length,
      reviews: rows.filter(
        (report) =>
          (report.content_type ??
            (report.comment_id ? "comment" : "review")) === "review"
      ).length,
      comments: rows.filter(
        (report) =>
          (report.content_type ??
            (report.comment_id ? "comment" : "review")) === "comment"
      ).length,
    };
  };

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

  const sentRows = (sent.data ?? []).filter((row) =>
    isAnalyticsNotificationKind(row.kind)
  );
  const openRows = (opens.data ?? []).filter((row) =>
    isAnalyticsNotificationKind(row.kind)
  );

  const sentByKind = new Map<string, number>();
  for (const row of sentRows) {
    const kind = row.kind;
    sentByKind.set(kind, (sentByKind.get(kind) ?? 0) + 1);
  }
  const openedByKind = new Map<string, number>();
  for (const row of openRows) {
    const kind = row.kind;
    openedByKind.set(kind, (openedByKind.get(kind) ?? 0) + 1);
  }

  const kinds = [
    ...new Set([...sentByKind.keys(), ...openedByKind.keys()]),
  ].sort();
  const byKind = kinds
    .map((kind) => {
      const sentCount = sentByKind.get(kind) ?? 0;
      const openedCount = openedByKind.get(kind) ?? 0;
      return {
        kind,
        sent: sentCount,
        opened: openedCount,
        openRate: sentCount > 0 ? openedCount / sentCount : null,
      };
    })
    .sort((left, right) => {
      if (right.sent !== left.sent) return right.sent - left.sent;
      return right.opened - left.opened;
    });

  // Conversion: an open counts if that member posted a review within 24h.
  const dayMs = 24 * 60 * 60 * 1000;
  const reviewsByUser = new Map<string, number[]>();
  for (const review of reviews.data ?? []) {
    const times = reviewsByUser.get(review.user_id) ?? [];
    times.push(new Date(review.inserted_at).getTime());
    reviewsByUser.set(review.user_id, times);
  }
  const converted = openRows.filter((open) => {
    const openedAt = new Date(open.opened_at).getTime();
    return (reviewsByUser.get(open.user_id) ?? []).some(
      (t) => t >= openedAt && t <= openedAt + dayMs
    );
  }).length;

  return {
    totalSent: sentRows.length,
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

export const fetchWeeklyPushSubscriberCount = async (): Promise<number> => {
  const { count, error } = await db()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("deleted", false)
    .eq("weekly_push_notifications_enabled", true);
  if (error) throw new Error(error.message);

  return count ?? 0;
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

export const USERS_PAGE_SIZE = 50;

export type ProfileSort =
  | "username"
  | "rank"
  | "review_count"
  | "deleted"
  | "created_at"
  | "last_review_at";
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

      const batch = (data ?? []).map((profile) => ({
        ...profile,
        ...authUsers.get(profile.id),
      }));
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
      ...profile,
      ...authUsers.get(profile.id),
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
    profile: { ...profile, ...authUsers.get(profile.id) },
    reviews: reviewRows.map((review) => ({
      ...review,
      location: Array.isArray(review.location)
        ? (review.location[0] ?? null)
        : review.location,
      engagement: emptyEngagement(),
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
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface AdminReviewDetail extends AdminReviewRow {
  image_url: string | null;
  image_public_url: string | null;
  location: { id: number; name: string | null; address: string | null } | null;
  spirit: { name: string | null } | null;
  type: { name: string | null } | null;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const emptyEngagement = () => ({ likes: 0, comments: 0, shares: 0 });

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
): Promise<Map<string, ReturnType<typeof emptyEngagement>>> => {
  const engagement = new Map(
    reviewIds.map((id) => [id, emptyEngagement()] as const)
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

  const tally = (
    reviewId: unknown,
    key: keyof ReturnType<typeof emptyEngagement>
  ) => {
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
      engagement: engagement.get(String(row.id)) ?? emptyEngagement(),
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
    engagement: engagement.get(id) ?? emptyEngagement(),
  };
};

export interface AdminLocation {
  id: number;
  name: string | null;
  address: string | null;
  rating: number | null;
  total_ratings: number;
}

export type LocationSort = "place" | "area" | "rating" | "reviews";

export interface MapPlace {
  id: number;
  name: string | null;
  address: string | null;
  lat: number;
  lon: number;
  rating: number | null;
  taste_avg: number | null;
  presentation_avg: number | null;
  total_ratings: number;
}

export interface AdminLocationDetail extends AdminLocation {
  place_id: string | null;
  inserted_at: string;
  created_by: string;
  all_reviews: number;
  reviews: AdminReviewRow[];
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
      engagement: emptyEngagement(),
    })),
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
  minReviews = 0,
  sort: LocationSort = "place",
  direction: SortDirection = "asc"
): Promise<{ locations: AdminLocation[]; total: number }> => {
  const offset = (Math.max(1, page) - 1) * perPage;
  let query = db()
    .from("locations")
    .select("id,name,address")
    .order("name", { ascending: true });
  if (search) {
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
  }

  const { data, error } = await query;
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
  const sorted = [...filtered].sort((left, right) => {
    const byPlace =
      (left.name ?? "").localeCompare(right.name ?? "") ||
      String(left.id).localeCompare(String(right.id));
    const placeTie = direction === "asc" ? byPlace : -byPlace;

    if (sort === "area") {
      const byArea =
        formatCityRegion(left.address).localeCompare(
          formatCityRegion(right.address)
        ) || byPlace;
      return direction === "asc" ? byArea : -byArea;
    }

    if (sort === "rating") {
      const byRating =
        (left.rating ?? -1) - (right.rating ?? -1) ||
        left.total_ratings - right.total_ratings ||
        byPlace;
      return direction === "asc" ? byRating : -byRating || placeTie;
    }

    if (sort === "reviews") {
      const byReviews =
        left.total_ratings - right.total_ratings ||
        (left.rating ?? -1) - (right.rating ?? -1) ||
        byPlace;
      return direction === "asc" ? byReviews : -byReviews || placeTie;
    }

    return direction === "asc" ? byPlace : -byPlace;
  });

  return {
    locations: sorted.slice(offset, offset + perPage),
    total: sorted.length,
  };
};

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Places with coordinates for the Places map, from the location_ratings view
 * (coordinates joined to rating aggregates). Without bounds it returns
 * everything — the initial render fits the viewport to the whole club. With
 * bounds it serves the map's viewport fetches as the operator pans, the same
 * shape as the app's locations_in_view RPC.
 */
export const fetchMapPlaces = async (
  bounds?: MapBounds
): Promise<MapPlace[]> => {
  let query = db()
    .from("location_ratings")
    .select(
      "id,name,address,lat,lon,rating,taste_avg,presentation_avg,total_ratings"
    );
  if (bounds) {
    query = query
      .gte("lat", bounds.minLat)
      .lte("lat", bounds.maxLat)
      .gte("lon", bounds.minLon)
      .lte("lon", bounds.maxLon);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => row.lat != null && row.lon != null)
    .map((row) => ({
      id: row.id,
      name: row.name ?? null,
      address: row.address ?? null,
      lat: Number(row.lat),
      lon: Number(row.lon),
      rating: row.rating ?? null,
      taste_avg: row.taste_avg ?? null,
      presentation_avg: row.presentation_avg ?? null,
      total_ratings: row.total_ratings ?? 0,
    }));
};

export const fetchAdminLocation = async (
  id: string
): Promise<AdminLocationDetail | null> => {
  if (!/^\d+$/.test(id)) return null;

  const [locationResult, ratingResult, reviewsResult] = await Promise.all([
    db()
      .from("locations")
      .select("id,name,address,place_id,inserted_at,created_by")
      .eq("id", id)
      .maybeSingle(),
    db()
      .from("location_ratings")
      .select("rating,total_ratings")
      .eq("id", id)
      .maybeSingle(),
    db()
      .from("reviews")
      .select(
        `id,comment,taste,presentation,inserted_at,state,
         profile:profiles!reviews_user_id_fkey1(id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio)`,
        { count: "exact" }
      )
      .eq("location", id)
      .order("inserted_at", { ascending: false })
      .limit(50),
  ]);
  if (locationResult.error) throw new Error(locationResult.error.message);
  if (ratingResult.error) throw new Error(ratingResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (!locationResult.data) return null;

  const location = locationResult.data;
  return {
    id: location.id,
    name: location.name,
    address: location.address,
    place_id: location.place_id,
    inserted_at: location.inserted_at,
    created_by: location.created_by,
    rating: ratingResult.data?.rating ?? null,
    total_ratings: ratingResult.data?.total_ratings ?? 0,
    all_reviews: reviewsResult.count ?? 0,
    reviews: (reviewsResult.data ?? []).map((review) => ({
      id: String(review.id),
      comment: review.comment,
      taste: review.taste,
      presentation: review.presentation,
      inserted_at: review.inserted_at,
      state: review.state,
      location: { id: location.id, name: location.name },
      profile: one(review.profile),
      engagement: emptyEngagement(),
    })),
  };
};

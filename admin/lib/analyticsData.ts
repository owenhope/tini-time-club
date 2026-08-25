import "server-only";
import { RANK_TIERS } from "@/lib/ranking";
import { resolveAudienceUsageResponse } from "@/lib/audienceUsage.mjs";
import { resolveLiveActivityResponse } from "@/lib/liveActivity.mjs";
import { resolveProductTelemetryResponse } from "@/lib/productTelemetry.mjs";
import { bucketByDay } from "@/lib/bucket";
import {
  fetchActiveLocationIds,
  fetchActiveMemberIds,
  fetchAuthUsers,
} from "@/lib/profileData";
import type { DateRange } from "@/lib/range";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

const db = supabaseAdmin;

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

import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import { resolveAudienceUsageResponse } from "@/lib/audienceUsage.mjs";
import { resolveLiveActivityResponse } from "@/lib/liveActivity.mjs";
import { resolveProductTelemetryResponse } from "@/lib/productTelemetry.mjs";
import { fetchAnalyticsOverview } from "./analytics/overview";
import { dashboardKpisFromOverview, type DashboardKpis } from "./dashboardKpis";
import type { DateRange } from "@/lib/range";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildTierDistributionFromCounts,
  type TierDistributionRow,
} from "@/lib/analyticsModels";

export type { TierDistributionRow } from "@/lib/analyticsModels";
export type { DashboardKpis, KpiMetric } from "./dashboardKpis";

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
  if (profilesResult.error)
    throw toAdminDataError(profilesResult.error, "load live activity profiles");

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

/**
 * The three headline KPIs — members, reviews, locations — each as an all-time
 * total plus this-window and previous-window counts. The analytics overview
 * RPC performs the aggregation in Postgres so dashboard load stays bounded as
 * the underlying tables grow.
 */
export const fetchDashboardKpis = (range: DateRange): Promise<DashboardKpis> =>
  fetchAnalyticsOverview(range).then(dashboardKpisFromOverview);

export const fetchTierDistribution = async (): Promise<
  TierDistributionRow[]
> => {
  const ranges = [
    db()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .or("review_count.lt.10,review_count.is.null"),
    db()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .gte("review_count", 10)
      .lt("review_count", 50),
    db()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .gte("review_count", 50)
      .lt("review_count", 150),
    db()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
      .gte("review_count", 150),
  ];
  const results = await Promise.all(ranges);
  for (const result of results) {
    if (result.error)
      throw toAdminDataError(result.error, "load tier distribution");
  }
  return buildTierDistributionFromCounts(
    results.map((result) => result.count ?? 0)
  );
};

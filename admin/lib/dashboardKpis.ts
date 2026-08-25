import type { AnalyticsOverview } from "./analytics/overview";
import type { DayCount } from "./analytics/shared";

export interface DashboardKpiMetric {
  total: number;
  current: number;
  previous: number;
  byDay: DayCount[];
}

export type KpiMetric = DashboardKpiMetric;

export interface DashboardKpis {
  users: DashboardKpiMetric;
  reviews: DashboardKpiMetric;
  locations: DashboardKpiMetric;
}

export const dashboardKpisFromOverview = (
  overview: AnalyticsOverview
): DashboardKpis => ({
  users: {
    total: overview.totals.members,
    current: overview.current.members,
    previous: overview.previous.members,
    byDay: overview.membersByDay,
  },
  reviews: {
    total: overview.totals.reviews,
    current: overview.current.reviews,
    previous: overview.previous.reviews,
    byDay: overview.reviewsByDay,
  },
  locations: {
    total: overview.totals.places,
    current: overview.current.places,
    previous: overview.previous.places,
    byDay: overview.placesByDay,
  },
});

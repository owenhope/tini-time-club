const metricLabel = {
  users: "New members",
  reviews: "Reviews",
  locations: "New places",
};

const metricHref = {
  users: "/admin/users",
  reviews: "/admin/reviews",
  locations: "/admin/places",
};

/** @typedef {"positive" | "mixed" | "attention"} ApplicationHealthStatus */
/** @typedef {{id: string, title: string, detail: string, href: string}} HealthItem */

const comparisonDetail = (current, previous) => {
  if (previous === 0) return `${current} this period, up from zero previously.`;
  const change = Math.round(((current - previous) / previous) * 100);
  return `${current} this period versus ${previous} previously (${change > 0 ? "+" : ""}${change}%).`;
};

/**
 * Explain application health using transparent operational rules. Growth is
 * period-over-period; auth and moderation are watch items, never blended into
 * a synthetic score.
 *
 * @param {{
 *   kpis: Record<'users'|'reviews'|'locations', {current: number, previous: number}>,
 *   telemetry: {available: boolean, retention: {eligibleInstallations: number, rate: number | null}, authHealth: {unexpectedSignOuts: number, sessionMissingAtLaunch: number, affectedInstallations: number}},
 *   pendingReports: number,
 *   rangeLabel: string
 * }} input
 * @returns {{status: ApplicationHealthStatus, headline: string, summary: string, wins: HealthItem[], losses: HealthItem[], watch: HealthItem[]}}
 */
export const buildApplicationHealth = ({
  kpis,
  telemetry,
  pendingReports,
  rangeLabel,
}) => {
  const wins = [];
  const losses = [];
  const watch = [];

  for (const key of Object.keys(metricLabel)) {
    const metric = kpis[key];
    const item = {
      id: key,
      title: metricLabel[key],
      detail: comparisonDetail(metric.current, metric.previous),
      href: metricHref[key],
    };
    if (metric.current > metric.previous) wins.push(item);
    else if (metric.current < metric.previous) losses.push(item);
    else {
      watch.push({
        ...item,
        detail:
          metric.current === 0
            ? `No activity in either ${rangeLabel.toLowerCase()} window.`
            : `${metric.current} in both comparable periods; momentum is flat.`,
      });
    }
  }

  if (pendingReports > 0) {
    watch.unshift({
      id: "reports",
      title: `${pendingReports} moderation report${pendingReports === 1 ? "" : "s"} pending`,
      detail: "Member-reported content is waiting for an operator decision.",
      href: "/admin/reports?status=pending",
    });
  } else {
    wins.push({
      id: "reports",
      title: "Moderation queue is clear",
      detail: "There are no pending member reports.",
      href: "/admin/reports",
    });
  }

  if (!telemetry.available) {
    watch.push({
      id: "telemetry",
      title: "Product health is not reporting yet",
      detail:
        "Deploy product telemetry to see session loss and D7 retention here.",
      href: "/admin/analytics#auth-health",
    });
  } else {
    const authEvents =
      telemetry.authHealth.unexpectedSignOuts +
      telemetry.authHealth.sessionMissingAtLaunch;
    if (authEvents > 0) {
      watch.unshift({
        id: "auth",
        title: `${telemetry.authHealth.affectedInstallations} installation${telemetry.authHealth.affectedInstallations === 1 ? "" : "s"} had session trouble`,
        detail: `${authEvents} unexpected authentication event${authEvents === 1 ? "" : "s"} in the selected period.`,
        href: "/admin/analytics#auth-health",
      });
    } else {
      wins.push({
        id: "auth",
        title: "No unexpected session loss detected",
        detail: "No auth-health events were reported in the selected period.",
        href: "/admin/analytics#auth-health",
      });
    }

    watch.push({
      id: "retention",
      title:
        telemetry.retention.rate == null
          ? "D7 retention is still collecting"
          : `D7 retention is ${telemetry.retention.rate}%`,
      detail:
        telemetry.retention.rate == null
          ? "No installation cohort has completed a full seven-day window yet."
          : `${telemetry.retention.eligibleInstallations} eligible installation${telemetry.retention.eligibleInstallations === 1 ? "" : "s"}; treat this as a baseline until period comparisons are available.`,
      href: "/admin/analytics#retention",
    });
  }

  const needsAttention =
    losses.length > wins.length ||
    pendingReports > 0 ||
    (telemetry.available && telemetry.authHealth.affectedInstallations > 0);
  const status = needsAttention
    ? "attention"
    : wins.length > losses.length
      ? "positive"
      : "mixed";

  return {
    status,
    headline:
      status === "positive"
        ? "The club has positive momentum"
        : status === "attention"
          ? "A few signals need attention"
          : "Performance is mixed",
    summary: `${wins.length} win${wins.length === 1 ? "" : "s"}, ${losses.length} loss${losses.length === 1 ? "" : "es"}, and ${watch.length} item${watch.length === 1 ? "" : "s"} to watch across ${rangeLabel.toLowerCase()}.`,
    wins,
    losses,
    watch,
  };
};

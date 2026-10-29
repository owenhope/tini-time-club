import { count, record } from "./model.mjs";

export function featureUsageFilters(params) {
  return {
    surface: params.surface === "admin" ? "admin" : "app",
    environment: ["preview", "development"].includes(params.environment)
      ? params.environment
      : "production",
    kind: ["screen", "action"].includes(params.kind) ? params.kind : "screen",
    sort: ["events", "installations"].includes(params.sort)
      ? params.sort
      : "reach",
  };
}

export function resolveFeatureUsage(value) {
  const rows = record(value).rows;
  if (!Array.isArray(rows)) throw new Error("Invalid feature usage response");
  return rows.map((value) => {
    const row = record(value);
    if (
      typeof row.event !== "string" ||
      typeof row.label !== "string" ||
      !["screen", "action"].includes(row.kind)
    )
      throw new Error("Invalid feature usage row");
    return {
      event: row.event,
      label: row.label,
      kind: row.kind,
      events: Math.max(0, count(row.events)),
      members: Math.max(0, count(row.members)),
      installations: Math.max(0, count(row.installations)),
      sessions: Math.max(0, count(row.sessions)),
      lastUsed: typeof row.lastUsed === "string" ? row.lastUsed : null,
    };
  });
}

/** @param {ReturnType<typeof resolveFeatureUsage>} rows
 * @param {ReturnType<typeof featureUsageFilters>} filters
 */
export function rankFeatureUsage(rows, filters) {
  const metric =
    filters.sort === "events"
      ? "events"
      : filters.sort === "installations" && filters.surface === "app"
        ? "installations"
        : filters.surface === "admin"
          ? "sessions"
          : "members";
  return rows
    .filter((row) => row.kind === filters.kind)
    .sort(
      (a, b) =>
        b[metric] - a[metric] ||
        b.events - a.events ||
        a.label.localeCompare(b.label)
    );
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  adminPageEvent,
  validPageUsage,
  usageEnvironment,
} from "../featureUsageCatalog.mjs";
import {
  featureUsageFilters,
  rankFeatureUsage,
  resolveFeatureUsage,
} from "../analytics/featureUsageModel.mjs";

test("admin routes exclude public, login, API and arbitrary paths; identifiers stay local", () => {
  for (const path of [
    "/",
    "/admin/login",
    "/admin/api/usage",
    "/admin/not-a-feature",
  ])
    assert.equal(adminPageEvent(path), null);
  assert.equal(adminPageEvent("/admin/users/private-id"), "page_users");
  assert.equal(
    adminPageEvent("/admin/places/golden-glass/regions/12"),
    "page_regions"
  );
  assert.equal(
    adminPageEvent("/admin/analytics/features"),
    "page_analytics_features"
  );
});
test("browser ingestion cannot submit server action events or arbitrary identifiers", () => {
  const id = "4a417008-b238-41c9-83da-6cab50032694";
  assert.equal(validPageUsage({ id, event: "page_dashboard" }), true);
  assert.equal(
    validPageUsage({ id, event: "action_notification_sent" }),
    false
  );
  assert.equal(
    validPageUsage({ id: "private-session", event: "page_dashboard" }),
    false
  );
  assert.equal(usageEnvironment(undefined), "development");
  assert.equal(usageEnvironment("preview"), "preview");
});
test("ranks app members separately from installations, frequency and admin sessions", () => {
  const rows = resolveFeatureUsage({
    rows: [
      {
        event: "a",
        label: "A",
        kind: "screen",
        members: "2",
        installations: 10,
        sessions: 1,
        events: 50,
      },
      {
        event: "b",
        label: "B",
        kind: "screen",
        members: 4,
        installations: 5,
        sessions: 3,
        events: 5,
      },
      { event: "c", label: "C", kind: "action", members: 99, events: 100 },
      { event: "d", label: "D", kind: "screen", events: 0 },
    ],
  });
  const filters = featureUsageFilters({});
  assert.deepEqual(
    rankFeatureUsage(rows, filters).map((r) => r.event),
    ["b", "a", "d"]
  );
  assert.equal(
    rankFeatureUsage(rows, { ...filters, sort: "events" })[0].event,
    "a"
  );
  assert.equal(
    rankFeatureUsage(rows, { ...filters, sort: "installations" })[0].event,
    "a"
  );
  assert.equal(
    rankFeatureUsage(rows, { ...filters, surface: "admin" })[0].event,
    "b"
  );
  assert.equal(rows[3].lastUsed, null);
  assert.equal(rows.length, 4);
});
test("invalid backend responses never masquerade as zero usage", () => {
  assert.throws(() => resolveFeatureUsage(null));
  assert.throws(() => resolveFeatureUsage({ rows: [{}] }));
});

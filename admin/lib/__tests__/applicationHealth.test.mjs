import assert from "node:assert/strict";
import test from "node:test";

import { buildApplicationHealth } from "../applicationHealth.mjs";

const telemetry = {
  available: true,
  retention: { eligibleInstallations: 10, rate: 40 },
  authHealth: {
    unexpectedSignOuts: 0,
    sessionMissingAtLaunch: 0,
    affectedInstallations: 0,
  },
};

test("explains wins, losses, and operational watch items", () => {
  const result = buildApplicationHealth({
    kpis: {
      users: { current: 12, previous: 10 },
      reviews: { current: 8, previous: 12 },
      locations: { current: 3, previous: 3 },
    },
    telemetry,
    pendingReports: 2,
    rangeLabel: "Last 30 days",
  });

  assert.equal(result.status, "attention");
  assert.equal(
    result.wins.some((item) => item.id === "users"),
    true
  );
  assert.equal(
    result.losses.some((item) => item.id === "reviews"),
    true
  );
  assert.equal(result.watch[0].id, "reports");
  assert.equal(
    result.watch.some((item) => item.id === "retention"),
    true
  );
});

test("calls out healthy auth and a clear moderation queue", () => {
  const result = buildApplicationHealth({
    kpis: {
      users: { current: 2, previous: 1 },
      reviews: { current: 4, previous: 3 },
      locations: { current: 1, previous: 0 },
    },
    telemetry,
    pendingReports: 0,
    rangeLabel: "Last 30 days",
  });

  assert.equal(result.status, "positive");
  assert.equal(
    result.wins.some((item) => item.id === "auth"),
    true
  );
  assert.equal(
    result.wins.some((item) => item.id === "reports"),
    true
  );
  assert.equal(result.losses.length, 0);
});

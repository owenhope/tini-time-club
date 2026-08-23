import assert from "node:assert/strict";
import test from "node:test";

import { buildProductFunnel } from "../productFunnel.mjs";

test("builds onboarding, first-review, and second-review milestones", () => {
  const result = buildProductFunnel({
    profiles: [
      { id: "one", eula_accepted_at: "2026-08-02T00:00:00.000Z" },
      { id: "two", eula_accepted_at: "2026-07-20T00:00:00.000Z" },
      { id: "three", eula_accepted_at: null },
    ],
    authUsers: new Map([
      ["one", { created_at: "2026-08-01T00:00:00.000Z" }],
      ["two", { created_at: "2026-07-01T00:00:00.000Z" }],
    ]),
    reviews: [
      { user_id: "one", inserted_at: "2026-08-03T00:00:00.000Z" },
      { user_id: "one", inserted_at: "2026-08-05T00:00:00.000Z" },
      { user_id: "two", inserted_at: "2026-07-11T00:00:00.000Z" },
    ],
    since: new Date("2026-08-01T00:00:00.000Z"),
    until: new Date("2026-08-31T23:59:59.999Z"),
  });

  assert.deepEqual(result, {
    onboardingCompletedTotal: 2,
    onboardingCompletedInRange: 1,
    membersWithFirstReview: 2,
    membersWithSecondReview: 1,
    firstReviewsInRange: 1,
    secondReviewsInRange: 1,
    averageDaysToFirstReview: 6,
  });
});

test("returns no average when no member has reviewed", () => {
  const result = buildProductFunnel({
    profiles: [],
    authUsers: new Map(),
    reviews: [],
    since: new Date("2026-08-01T00:00:00.000Z"),
    until: new Date("2026-08-31T23:59:59.999Z"),
  });

  assert.equal(result.averageDaysToFirstReview, null);
});

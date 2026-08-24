import assert from "node:assert/strict";
import test from "node:test";
import { resolveContent } from "../analytics/contentModel.mjs";
import { resolveEngagement } from "../analytics/engagementModel.mjs";
import { resolveGrowth } from "../analytics/growthModel.mjs";
import { resolveOverview } from "../analytics/overviewModel.mjs";

test("overview normalizes Postgres counts and complete daily series", () => {
  const result = resolveOverview({
    totals: { members: "52", reviews: 120, places: "83" },
    current: { members: "9", indexInteractions: "14" },
    previous: { members: "4" },
    membersByDay: [{ day: "2026-08-21", count: "2" }],
  });
  assert.deepEqual(result.totals, { members: 52, reviews: 120, places: 83 });
  assert.equal(result.current.indexInteractions, 14);
  assert.deepEqual(result.membersByDay, [{ day: "2026-08-21", count: 2 }]);
  assert.deepEqual(result.reviewsByDay, []);
});

test("growth preserves a nullable first-review duration", () => {
  assert.equal(
    resolveGrowth({ averageDaysToFirstReview: null }).averageDaysToFirstReview,
    null
  );
  assert.equal(
    resolveGrowth({ averageDaysToFirstReview: "3.75" })
      .averageDaysToFirstReview,
    3.75
  );
});

test("engagement maps bounded share rows and cursor fields", () => {
  const result = resolveEngagement({
    current: { shares: "21" },
    topSharers: [
      {
        id: "member-1",
        username: "olive",
        review_count: "7",
        share_count: "3",
        last_shared_at: "2026-08-22T10:00:00Z",
      },
    ],
    recentReviewShares: [
      {
        id: "share-1",
        reviewId: "91",
        locationName: "Bar One",
        channel: "sheet",
        outcome: "shared",
        sharedAt: "2026-08-22T09:00:00Z",
        profile: { id: "member-1", username: "olive" },
      },
    ],
    hasMore: true,
    nextCursorAt: "2026-08-22T09:00:00Z",
    nextCursorId: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(result.current.shares, 21);
  assert.equal(result.topSharers[0].shareCount, 3);
  assert.equal(result.recentReviewShares[0].reviewId, 91);
  assert.equal(result.recentReviewShares[0].profile.review_count, 0);
  assert.equal(result.hasMore, true);
  assert.equal(result.nextCursorId, "00000000-0000-4000-8000-000000000001");
});

test("content calculates shares without downloading review rows", () => {
  const result = resolveContent({
    spiritPopularity: [
      { id: 1, name: "Gin", reviewCount: "3" },
      { id: 2, name: "Vodka", reviewCount: 1 },
    ],
    topPlaces: [
      {
        id: "9",
        name: "The Gull",
        rating: "4.25",
        totalRatings: "8",
        reviewsInRange: "4",
      },
    ],
  });
  assert.equal(result.spiritPopularity[0].share, 0.75);
  assert.equal(result.spiritPopularity[1].share, 0.25);
  assert.deepEqual(result.topPlaces[0], {
    id: 9,
    name: "The Gull",
    address: null,
    rating: 4.25,
    totalRatings: 8,
    reviewsInRange: 4,
  });
});

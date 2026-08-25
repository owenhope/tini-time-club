import assert from "node:assert/strict";
import test from "node:test";
import { resolveDashboardActivityResponse } from "../dashboardActivityModel.mjs";

test("normalizes bounded dashboard activity rows", () => {
  const result = resolveDashboardActivityResponse({
    latest: {
      members: [
        { id: "member-1", review_count: "4", created_at: "2026-08-25" },
      ],
      reviews: [
        {
          id: 12,
          inserted_at: "2026-08-25T12:00:00Z",
          taste: "4",
          presentation: 5,
          location: { id: 9, name: "Bar" },
          profile: { id: "member-1", username: "owen" },
          engagement: { likes: 3, comments: 2, shares: 0 },
        },
      ],
      locations: [{ id: 9, name: "Bar", address: "Main St" }],
    },
    top: {
      members: [],
      reviews: [],
      locations: [{ id: 9, name: "Bar", rating: "4.8", total_ratings: "3" }],
    },
  });

  assert.equal(result.latest.members[0].review_count, 4);
  assert.equal(result.latest.reviews[0].id, "12");
  assert.deepEqual(result.latest.reviews[0].engagement, {
    likes: 3,
    comments: 2,
    shares: 0,
  });
  assert.equal(result.top.locations[0].rating, 4.8);
  assert.equal(result.top.locations[0].total_ratings, 3);
});

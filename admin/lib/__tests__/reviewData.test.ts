import {
  buildReviewEngagement,
  buildReviewEngagementFromCounts,
} from "../reviewModels";

describe("admin review engagement", () => {
  it("counts only the requested review rows and keeps missing shares at zero", () => {
    const engagement = buildReviewEngagement(
      ["101", "102"],
      [{ review_id: 101 }, { review_id: 101 }],
      [{ review_id: 101 }, { review_id: 102 }],
      []
    );

    expect([...engagement.entries()]).toEqual([
      ["101", { likes: 2, comments: 1, shares: 0 }],
      ["102", { likes: 0, comments: 1, shares: 0 }],
    ]);
  });

  it("normalizes database-side engagement counts for requested reviews", () => {
    const engagement = buildReviewEngagementFromCounts(["101", "102"], {
      "101": { likes: "2", comments: 1, shares: 3 },
    });

    expect([...engagement.entries()]).toEqual([
      ["101", { likes: 2, comments: 1, shares: 3 }],
      ["102", { likes: 0, comments: 0, shares: 0 }],
    ]);
  });
});

import { buildReviewEngagement } from "../reviewModels";

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
});

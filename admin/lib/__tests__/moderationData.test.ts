import { normalizeModerationReports } from "../moderationModels";

describe("admin moderation normalization", () => {
  it("defaults legacy rows to pending and infers comment reports", () => {
    const reports = normalizeModerationReports(
      [
        {
          id: "report-1",
          created_at: "2026-08-25T10:00:00Z",
          reason: "Spam",
          status: null,
          content_type: null,
          review_id: null,
          comment_id: 42,
          reporter_id: null,
          creator_id: null,
          content_snapshot: ["legacy"],
        },
      ],
      new Map(),
      new Map(),
      new Map([[42, { id: 42, body: "Visit my site" }]])
    );

    expect(reports).toEqual([
      {
        id: "report-1",
        created_at: "2026-08-25T10:00:00Z",
        reason: "Spam",
        status: "pending",
        content_type: "comment",
        review_id: null,
        comment_id: 42,
        content_snapshot: {},
        reporter: null,
        creator: null,
        review: null,
        comment: { id: 42, body: "Visit my site" },
      },
    ]);
  });
});

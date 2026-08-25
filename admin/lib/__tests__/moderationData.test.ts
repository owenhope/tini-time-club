import {
  normalizeModerationReportResponse,
  normalizeModerationReports,
} from "../moderationModels";

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

  it("normalizes the bounded report RPC response", () => {
    expect(
      normalizeModerationReportResponse({
        total: "1",
        counts: { total: "1", pending: "1", reviews: "1", comments: "0" },
        reports: [
          {
            id: "report-2",
            created_at: "2026-08-25T12:00:00Z",
            reason: "Spam",
            status: "pending",
            content_type: "review",
            review_id: "8",
            comment_id: null,
            content_snapshot: { caption: "bad" },
            reporter: { id: "member-1", username: "reporter" },
            creator: null,
            review: {
              id: "8",
              comment: "bad",
              state: 1,
              location: { name: "Bar" },
            },
            comment: null,
          },
        ],
      })
    ).toMatchObject({
      total: 1,
      counts: { pending: 1, reviews: 1 },
      reports: [
        expect.objectContaining({
          review_id: 8,
          reporter: expect.objectContaining({ username: "reporter" }),
        }),
      ],
    });
  });
});

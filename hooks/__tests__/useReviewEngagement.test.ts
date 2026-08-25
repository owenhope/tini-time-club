import {
  buildReviewPreviewComments,
  type ReviewWithCommentPatch,
} from "@/utils/reviewEngagement";
import type { Review } from "@/types/types";

const review = (
  patch: Partial<ReviewWithCommentPatch> = {}
): ReviewWithCommentPatch =>
  ({
    id: "review-1",
    recent_comments: [
      {
        id: 1,
        body: "First",
        likes_count: 2,
        has_liked: false,
        profile: { id: "member-1", username: "One" },
      },
      {
        id: 2,
        body: "Second",
        likes_count: 1,
        has_liked: true,
        profile: { id: "member-2", username: "Two" },
      },
    ],
    ...patch,
  }) as Review;

describe("buildReviewPreviewComments", () => {
  it("keeps the feed preview newest-first and applies local like overrides", () => {
    expect(
      buildReviewPreviewComments(review(), {
        1: { has_liked: true, likes_count: 3 },
      })
    ).toEqual([
      expect.objectContaining({ id: 1, has_liked: true, likes_count: 3 }),
    ]);
  });

  it("applies add and delete patches before limiting the preview", () => {
    const added = {
      id: 3,
      body: "Newest",
      inserted_at: "2026-08-25T00:00:00.000Z",
      likes_count: 0,
      has_liked: false,
      profile: { id: "member-3", username: "Three" },
    };

    expect(
      buildReviewPreviewComments(
        review({ _commentPatch: { action: "add", data: added } }),
        {}
      )[0].id
    ).toBe(3);
    expect(
      buildReviewPreviewComments(
        review({ _commentPatch: { action: "delete", id: 1 } }),
        {}
      )[0].id
    ).toBe(2);
  });
});

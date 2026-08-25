import { normalizeCommentLikeCounts } from "../commentLikeCounts";

describe("comment like count normalization", () => {
  it("normalizes aggregate counts and viewer state without raw like rows", () => {
    expect([
      ...normalizeCommentLikeCounts({
        "12": { count: "4", has_liked: true },
        "13": { count: 0, has_liked: false },
      }).entries(),
    ]).toEqual([
      [12, { count: 4, has_liked: true }],
      [13, { count: 0, has_liked: false }],
    ]);
  });
});

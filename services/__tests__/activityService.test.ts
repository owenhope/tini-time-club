const mockRpc = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("@/utils/imageCache", () => ({
  __esModule: true,
  default: {
    getReviewImageUrls: jest.fn(async () => ({})),
  },
}));

import { fetchActivityPage } from "@/services/activityService";

describe("activityService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("decodes comment-like notifications into Activity events", async () => {
    mockRpc.mockResolvedValue({
      data: {
        events: [
          {
            id: "notification-1",
            createdAt: "2026-08-17T12:00:00.000Z",
            kind: "comment_liked",
            body: "olive liked your comment.",
            actor: {
              id: "actor-1",
              username: "olive",
              avatarUrl: null,
              isVerified: false,
              reviewCount: 4,
            },
            isFollowing: false,
            review: {
              id: "42",
              imagePath: null,
              locationId: "7",
            },
            comment: {
              id: "9",
              body: "Perfectly cold.",
            },
            data: {
              reviewId: 42,
              commentId: 9,
              url: "/r/42?comments=1",
            },
            seenAt: null,
            readAt: null,
          },
        ],
        nextCursor: null,
        hasMore: false,
        snapshotAt: "2026-08-17T12:01:00.000Z",
      },
      error: null,
    });

    await expect(fetchActivityPage()).resolves.toEqual(
      expect.objectContaining({
        events: [
          expect.objectContaining({
            id: "notification-1",
            kind: "comment_liked",
            comment: { id: "9", body: "Perfectly cold." },
          }),
        ],
      })
    );
  });
});

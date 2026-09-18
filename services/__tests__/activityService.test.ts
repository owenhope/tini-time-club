const mockRpc = jest.fn();
const mockChannel = jest.fn();
const mockChannelOn = jest.fn();
const mockChannelSubscribe = jest.fn();
const channel = {
  on: mockChannelOn,
  subscribe: mockChannelSubscribe,
};

jest.mock("@/utils/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/utils/imageCache", () => ({
  __esModule: true,
  default: {
    getReviewImageUrls: jest.fn(async () => ({})),
  },
}));

import {
  fetchActivityPage,
  subscribeToActivityChanges,
} from "@/services/activityService";

describe("activityService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockChannel.mockReset();
    mockChannelOn.mockReset();
    mockChannelSubscribe.mockReset();
    mockChannelOn.mockReturnValue(channel);
    mockChannel.mockReturnValue(channel);
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
            actor: expect.objectContaining({ passport_points: null }),
            comment: { id: "9", body: "Perfectly cold." },
          }),
        ],
      })
    );
  });

  it.each([undefined, null, 0, 500, "500", NaN, -1])(
    "decodes actor points independently of review counts (%s)",
    async (passportPoints) => {
      mockRpc.mockResolvedValue({
        data: {
          events: [
            {
              id: "notification-1",
              createdAt: "2026-09-18T00:00:00Z",
              kind: "review_liked",
              actor: {
                id: "actor-1",
                username: "olive",
                avatarUrl: "avatar.jpg",
                isVerified: true,
                reviewCount: 12,
                passportPoints,
              },
              body: "olive liked your review.",
              data: { reviewId: 42 },
              isFollowing: true,
            },
          ],
        },
        error: null,
      });
      const page = await fetchActivityPage();
      expect(page.events[0]).toMatchObject({
        body: "olive liked your review.",
        data: { reviewId: 42 },
        isFollowing: true,
        actor: {
          id: "actor-1",
          username: "olive",
          avatar_url: "avatar.jpg",
          is_verified: true,
          review_count: 12,
          passport_points:
            typeof passportPoints === "number" &&
            Number.isFinite(passportPoints) &&
            passportPoints >= 0
              ? passportPoints
              : null,
        },
      });
    }
  );

  it.each([null, {}, { id: 42 }, { id: " " }])(
    "keeps notifications with missing or invalid actors (%s)",
    async (actor) => {
      mockRpc.mockResolvedValue({
        data: {
          events: [
            {
              id: "notification-1",
              createdAt: "2026-09-18T00:00:00Z",
              kind: "admin_message",
              actor,
              body: "Club news",
              data: { url: "/passport" },
            },
          ],
        },
        error: null,
      });
      const page = await fetchActivityPage();
      expect(page.events).toHaveLength(1);
      expect(page.events[0]).toMatchObject({
        actor: null,
        body: "Club news",
        data: { url: "/passport" },
      });
    }
  );

  it("keeps the Someone fallback and uses safe avatar defaults", async () => {
    mockRpc.mockResolvedValue({
      data: {
        events: [
          {
            id: "notification-1",
            createdAt: "2026-09-18T00:00:00Z",
            kind: "user_followed",
            actor: {
              id: "actor-1",
              avatarUrl: {},
              isVerified: "true",
              passportPoints: 0,
            },
          },
        ],
      },
      error: null,
    });
    const page = await fetchActivityPage();
    expect(page.events[0].actor).toEqual({
      id: "actor-1",
      username: "Someone",
      avatar_url: null,
      is_verified: false,
      review_count: 0,
      passport_points: 0,
    });
  });

  it("refreshes once the realtime Activity subscription is ready", () => {
    const onChange = jest.fn();

    subscribeToActivityChanges("user-1", onChange);

    expect(mockChannel).toHaveBeenCalledWith(
      expect.stringMatching(/^activity:user-1:\d+$/)
    );
    expect(mockChannelSubscribe).toHaveBeenCalledWith(expect.any(Function));

    // Concurrent subscribers (unseen-badge provider + Activity screen) must
    // not share a topic: supabase-js reuses one channel per topic and throws
    // when listeners are added after subscribe().
    subscribeToActivityChanges("user-1", jest.fn());
    expect(mockChannel.mock.calls[1][0]).not.toBe(mockChannel.mock.calls[0][0]);

    const onStatus = mockChannelSubscribe.mock.calls[0][0] as (
      status: string
    ) => void;
    onStatus("SUBSCRIBED");

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

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
            comment: { id: "9", body: "Perfectly cold." },
          }),
        ],
      })
    );
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

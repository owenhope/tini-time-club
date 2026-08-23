const mockRpc = jest.fn();
const mockGetReviewImageUrls = jest.fn();
const mockGetFeedPage = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("@/utils/imageCache", () => ({
  __esModule: true,
  default: {
    getReviewImageUrls: (...args: unknown[]) => mockGetReviewImageUrls(...args),
  },
}));

jest.mock("@/services/public-content-service", () => ({
  publicContentService: {
    getFeedPage: (...args: unknown[]) => mockGetFeedPage(...args),
  },
}));

import { getReviewPage } from "@/services/reviewFeedService";

const review = {
  id: 91,
  comment: "Cold and bright.",
  image_url: "member-1/review.jpg",
  inserted_at: "2026-08-23T10:00:00.000Z",
  taste: 4.5,
  presentation: 4,
  user_id: "member-1",
  location: {
    id: 42,
    name: "The Test Bar",
    address: "100 Test Street",
    rating: 4.3,
    total_ratings: 8,
  },
  spirit: { name: "Gin" },
  type: { name: "Dry" },
  profile: { id: "member-1", username: "olive", review_count: 10 },
  likes_count: 2,
  comments_count: 1,
  has_liked: true,
  recent_comments: [
    {
      id: 7,
      body: "Perfect.",
      inserted_at: "2026-08-23T10:02:00.000Z",
      user_id: "member-2",
      review_id: 91,
      likes_count: 3,
      has_liked: true,
      profile: { id: "member-2", username: "twist", review_count: 4 },
    },
  ],
};

describe("getReviewPage", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockGetReviewImageUrls.mockReset();
    mockGetFeedPage.mockReset();
    mockGetReviewImageUrls.mockResolvedValue({
      "member-1/review.jpg": "https://signed.test/review.jpg",
    });
  });

  it("loads an anonymous cursor page through the public adapter", async () => {
    mockGetFeedPage.mockResolvedValue({
      reviews: [{ ...review, image_url: "https://signed.test/public.jpg" }],
      nextCursor: { insertedAt: review.inserted_at, id: "91" },
      hasMore: true,
    });

    await expect(
      getReviewPage({
        locationId: 42,
        limit: 12,
        cursor: { insertedAt: "2026-08-23T11:00:00.000Z", id: "100" },
      })
    ).resolves.toEqual({
      reviews: [expect.objectContaining({ id: "91" })],
      nextCursor: { insertedAt: review.inserted_at, id: "91" },
      hasMore: true,
    });

    expect(mockGetFeedPage).toHaveBeenCalledWith({
      cursor: { insertedAt: "2026-08-23T11:00:00.000Z", id: "100" },
      limit: 12,
      locationId: 42,
      userId: undefined,
    });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockGetReviewImageUrls).not.toHaveBeenCalled();
  });

  it("loads a fully hydrated cursor page in one database request", async () => {
    mockRpc.mockResolvedValue({
      data: {
        reviews: [review],
        nextCursor: {
          insertedAt: review.inserted_at,
          id: 91,
        },
        hasMore: true,
      },
      error: null,
    });

    await expect(
      getReviewPage({
        viewerId: "viewer-1",
        followedOnly: true,
        limit: 20,
        cursor: {
          insertedAt: "2026-08-23T11:00:00.000Z",
          id: "100",
        },
      })
    ).resolves.toEqual({
      reviews: [
        expect.objectContaining({
          id: "91",
          image_url: "https://signed.test/review.jpg",
          recent_comments: [
            expect.objectContaining({ likes_count: 3, has_liked: true }),
          ],
        }),
      ],
      nextCursor: {
        insertedAt: review.inserted_at,
        id: "91",
      },
      hasMore: true,
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_feed_page_v1", {
      p_cursor_id: 100,
      p_cursor_inserted_at: "2026-08-23T11:00:00.000Z",
      p_exclude_blocked: true,
      p_followed_only: true,
      p_limit: 20,
      p_location_id: null,
      p_user_id: null,
      p_viewer: "viewer-1",
    });
    expect(mockGetReviewImageUrls).toHaveBeenCalledTimes(1);
  });
});

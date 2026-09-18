const mockRpc = jest.fn();
const mockGetCommentPage = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("@/services/public-content-service", () => ({
  publicContentService: {
    getCommentPage: (...args: unknown[]) => mockGetCommentPage(...args),
  },
}));

jest.mock("@/services/mentionService", () => ({
  hydrateCommentMentions: async (comments: unknown[]) => comments,
}));

import { getCommentPage } from "@/services/commentPageService";

describe("getCommentPage", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockGetCommentPage.mockReset();
  });

  it("loads an authenticated page with an older-comments cursor and total count", async () => {
    mockRpc.mockResolvedValue({
      data: {
        comments: [
          {
            id: 7,
            body: "First",
            inserted_at: "2026-08-23T10:00:00.000Z",
            review_id: 91,
            user_id: "member-2",
            likes_count: 3,
            has_liked: true,
            profile: { id: "member-2", username: "twist" },
          },
        ],
        nextCursor: {
          insertedAt: "2026-08-23T10:00:00.000Z",
          id: 7,
        },
        hasMore: true,
        totalCount: 41,
      },
      error: null,
    });

    await expect(
      getCommentPage({
        reviewId: "91",
        viewerId: "viewer-1",
        cursor: {
          insertedAt: "2026-08-23T10:30:00.000Z",
          id: "12",
        },
        limit: 20,
      })
    ).resolves.toEqual({
      comments: [expect.objectContaining({ id: 7, likes_count: 3 })],
      nextCursor: {
        insertedAt: "2026-08-23T10:00:00.000Z",
        id: "7",
      },
      hasMore: true,
      totalCount: 41,
    });

    expect(mockRpc).toHaveBeenCalledWith("get_comment_page_v1", {
      p_cursor_id: 12,
      p_cursor_inserted_at: "2026-08-23T10:30:00.000Z",
      p_limit: 20,
      p_review_id: 91,
      p_viewer: "viewer-1",
    });
    expect(mockGetCommentPage).not.toHaveBeenCalled();
  });
});

describe.each(["member", "visitor"])(
  "%s comment profile contract",
  (viewer) => {
    it.each([undefined, null, 0, 500, "500", NaN])(
      "normalizes Passport points (%s) independently of review counts",
      async (points) => {
        const payload = {
          comments: [
            {
              id: 7,
              body: "Cold",
              inserted_at: "2026-09-18T00:00:00Z",
              user_id: "member-2",
              profile: {
                id: "member-2",
                username: "twist",
                passport_points: points,
                review_count: 12,
                is_verified: true,
                avatar_url: "avatar.jpg",
                private_field: "omit",
              },
              likes_count: 3,
              has_liked: true,
            },
          ],
          totalCount: 1,
        };
        mockRpc.mockResolvedValue({ data: payload, error: null });
        mockGetCommentPage.mockResolvedValue(payload);
        const page = await getCommentPage({
          reviewId: 91,
          viewerId: viewer === "member" ? "viewer-1" : undefined,
        });
        expect(page.comments[0].profile).toEqual({
          id: "member-2",
          username: "twist",
          passport_points:
            typeof points === "number" && Number.isFinite(points)
              ? points
              : null,
          review_count: 12,
          is_verified: true,
          avatar_url: "avatar.jpg",
        });
        expect(page.comments[0]).toMatchObject({
          likes_count: 3,
          has_liked: true,
        });
      }
    );

    it.each([
      null,
      { id: 42 },
      { id: "different-member", passport_points: 1000 },
    ])(
      "keeps the comment without an invalid or mismatched profile",
      async (profile) => {
        const payload = {
          comments: [
            {
              id: 7,
              body: "Cold",
              inserted_at: "2026-09-18T00:00:00Z",
              user_id: "member-2",
              profile,
            },
          ],
        };
        mockRpc.mockResolvedValue({ data: payload, error: null });
        mockGetCommentPage.mockResolvedValue(payload);
        const page = await getCommentPage({
          reviewId: 91,
          viewerId: viewer === "member" ? "viewer-1" : undefined,
        });
        expect(page.comments).toHaveLength(1);
        expect(page.comments[0].profile).toBeUndefined();
      }
    );
  }
);

it("drops malformed comment rows without losing valid comments", async () => {
  mockGetCommentPage.mockResolvedValue({
    comments: [
      null,
      { id: "7", body: "Bad", inserted_at: "2026-09-18" },
      {
        id: 8,
        body: "Valid",
        inserted_at: "2026-09-18",
        profile: { id: "member-2", username: "twist", passport_points: 0 },
      },
    ],
  });
  const page = await getCommentPage({ reviewId: 91 });
  expect(page.comments).toHaveLength(1);
  expect(page.comments[0]).toMatchObject({
    id: 8,
    profile: { passport_points: 0 },
  });
});

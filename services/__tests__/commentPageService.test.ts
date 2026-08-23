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

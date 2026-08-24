const mockRpc = jest.fn();
const mockGetSession = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  clearMentionSearchCache,
  hydrateReviewMentions,
  searchMentionCandidates,
} from "@/services/mentionService";
import type { Review } from "@/types/types";

const review: Review = {
  id: "91",
  comment: "Cheers @olive",
  image_url: "review.jpg",
  inserted_at: "2026-08-23T10:00:00.000Z",
  taste: 4.5,
  presentation: 4,
  user_id: "author-1",
  location: { id: "3", name: "Dovetail" },
  spirit: { name: "Gin" },
  type: { name: "Dry" },
  profile: { id: "author-1", username: "author" },
  recent_comments: [
    {
      id: 7,
      body: "Thanks @twist",
      inserted_at: "2026-08-23T10:02:00.000Z",
    },
  ],
};

describe("mentionService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "viewer-1" } } },
      error: null,
    });
    clearMentionSearchCache();
  });

  it("normalizes queries, decodes candidates, and caches results", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: "member-1",
          username: "olive",
          name: "Olive Fan",
          avatarUrl: "avatar.jpg",
          isVerified: true,
          reviewCount: 12,
          relationship: "mutual",
        },
        { username: "missing-id" },
      ],
      error: null,
    });

    await expect(searchMentionCandidates(" Olive ")).resolves.toEqual([
      expect.objectContaining({
        id: "member-1",
        username: "olive",
        relationship: "mutual",
      }),
    ]);
    await searchMentionCandidates("olive");

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("search_mention_candidates_v1", {
      p_limit: 5,
      p_query: "olive",
    });
  });

  it("coalesces concurrent searches for the same query", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    mockRpc.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const first = searchMentionCandidates("twist");
    const second = searchMentionCandidates("TWIST");
    resolveRequest?.({ data: [], error: null });

    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("does not reuse relationship-filtered results after an account switch", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: [
          {
            id: "member-a",
            username: "olive_a",
            relationship: "following",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "member-b",
            username: "olive_b",
            relationship: "follows_you",
          },
        ],
        error: null,
      });

    await expect(searchMentionCandidates("olive")).resolves.toEqual([
      expect.objectContaining({ id: "member-a" }),
    ]);
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "viewer-2" } } },
      error: null,
    });
    await expect(searchMentionCandidates("olive")).resolves.toEqual([
      expect.objectContaining({ id: "member-b" }),
    ]);

    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("discards a search response when the account changes in flight", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    mockRpc.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const request = searchMentionCandidates("olive");
    await Promise.resolve();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "viewer-2" } } },
      error: null,
    });
    resolveRequest?.({
      data: [
        {
          id: "member-a",
          username: "olive_a",
          relationship: "following",
        },
      ],
      error: null,
    });

    await expect(request).resolves.toEqual([]);
  });

  it("hydrates review and comment ranges in one batch", async () => {
    mockRpc.mockResolvedValue({
      data: {
        mentions: [
          {
            sourceKind: "review",
            sourceId: 91,
            profileId: "member-1",
            username: "olive",
            start: 7,
            length: 6,
          },
          {
            sourceKind: "comment",
            sourceId: 7,
            profileId: "member-2",
            username: "twist",
            start: 7,
            length: 6,
          },
        ],
      },
      error: null,
    });

    const [hydrated] = await hydrateReviewMentions([review]);

    expect(mockRpc).toHaveBeenCalledWith("get_mention_spans_v1", {
      p_comment_ids: [7],
      p_review_ids: [91],
    });
    expect(hydrated.mentions).toEqual([
      expect.objectContaining({ profileId: "member-1", start: 7 }),
    ]);
    expect(hydrated.recent_comments?.[0].mentions).toEqual([
      expect.objectContaining({ profileId: "member-2", start: 7 }),
    ]);
  });
});

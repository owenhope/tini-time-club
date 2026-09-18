import databaseService from "../databaseService";
import { supabase } from "@/utils/supabase";

const mockGetPublicFeed = jest.fn();
const mockGetPublicReview = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
  supabaseProjectRef: "testref",
}));

jest.mock("@/utils/imageCache", () => ({
  __esModule: true,
  default: {
    getReviewImageUrls: jest.fn(async (urls: string[]) =>
      Object.fromEntries(urls.map((url) => [url, url]))
    ),
    getReviewImageUrl: jest.fn(async (url: string) => url),
  },
}));

jest.mock("@/services/public-content-service", () => ({
  publicContentService: {
    getFeed: (...args: unknown[]) => mockGetPublicFeed(...args),
    getReview: (...args: unknown[]) => mockGetPublicReview(...args),
  },
}));

jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn(async () => undefined) },
}));

jest.mock("@/utils/log", () => ({
  reportError: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("@/utils/reviewOptions", () => ({
  getSupportedSpirits: jest.fn(),
  getSupportedTypes: jest.fn(),
}));

const from = supabase.from as jest.Mock;
const rpc = supabase.rpc as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await databaseService.clearAllCaches();
});

it("keeps the replacement request deduplicated when an invalidated read finishes", async () => {
  const releases: ((value: unknown) => void)[] = [];
  const single = jest.fn(
    () => new Promise((resolve) => releases.push(resolve))
  );
  const query = { select: jest.fn(), eq: jest.fn(), single };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  from.mockReturnValue(query);
  const oldRead = databaseService.getUserProfile("member-1");
  await databaseService.clearAllCaches();
  const freshRead = databaseService.getUserProfile("member-1");
  releases[0]({ data: { id: "member-1", username: "stale" }, error: null });
  await oldRead;
  const joinedRead = databaseService.getUserProfile("member-1");
  expect(single).toHaveBeenCalledTimes(2);
  releases[1]({ data: { id: "member-1", username: "fresh" }, error: null });
  await expect(Promise.all([freshRead, joinedRead])).resolves.toEqual([
    {
      id: "member-1",
      username: "fresh",
      avatar_url: null,
      is_verified: false,
      passport_points: null,
    },
    {
      id: "member-1",
      username: "fresh",
      avatar_url: null,
      is_verified: false,
      passport_points: null,
    },
  ]);
});

it("does not reuse a profile read completed after cache invalidation", async () => {
  let release!: (value: unknown) => void;
  const single = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    )
    .mockResolvedValue({
      data: {
        id: "member-1",
        username: "fresh",
        avatar_url: null,
        is_verified: false,
        passport_points: null,
      },
      error: null,
    });
  const query = { select: jest.fn(), eq: jest.fn(), single };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  from.mockReturnValue(query);

  const oldRead = databaseService.getUserProfile("member-1");
  await databaseService.clearAllCaches();
  release({ data: { id: "member-1", username: "stale" }, error: null });
  await oldRead;

  await expect(
    databaseService.getUserProfile("member-1")
  ).resolves.toMatchObject({ username: "fresh" });
  expect(single).toHaveBeenCalledTimes(2);
});

it("refreshes location verification state instead of caching it", async () => {
  const single = jest
    .fn()
    .mockResolvedValueOnce({
      data: {
        id: 42,
        name: "Example Bar",
        address: null,
        rating: 4,
        taste_avg: 4,
        presentation_avg: 4,
        total_ratings: 2,
        is_golden_glass: false,
        is_location_verified: false,
      },
      error: null,
    })
    .mockResolvedValueOnce({
      data: {
        id: 42,
        name: "Example Bar",
        address: null,
        rating: 4,
        taste_avg: 4,
        presentation_avg: 4,
        total_ratings: 2,
        is_golden_glass: false,
        is_location_verified: true,
      },
      error: null,
    });
  from.mockReturnValue({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({ single })),
    })),
  });

  await expect(
    databaseService.getLocation("42", "viewer-1")
  ).resolves.toMatchObject({
    is_location_verified: false,
  });
  await expect(
    databaseService.getLocation("42", "viewer-1")
  ).resolves.toMatchObject({
    is_location_verified: true,
  });

  expect(single).toHaveBeenCalledTimes(2);
});

it("loads a followed-members page with one feed RPC", async () => {
  rpc.mockResolvedValue({ data: [], error: null });

  await expect(
    databaseService.getReviews({
      currentUserId: "viewer-1",
      followedOnly: true,
      limit: 20,
      offset: 40,
    })
  ).resolves.toEqual([]);

  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith("feed_reviews_followed", {
    p_viewer: "viewer-1",
    p_limit: 20,
    p_offset: 40,
    p_user_id: null,
    p_location_id: null,
    p_exclude_blocked: true,
    p_followed_only: true,
  });
  expect(from).not.toHaveBeenCalled();
});

it("loads the club feed through the sanitized gateway for a visitor", async () => {
  const publicReviews = [{ id: "42", comment: "Cold and bright." }];
  mockGetPublicFeed.mockResolvedValue(publicReviews);

  await expect(
    databaseService.getReviews({ limit: 12, offset: 24 })
  ).resolves.toEqual(publicReviews);

  expect(mockGetPublicFeed).toHaveBeenCalledWith({
    userId: undefined,
    locationId: undefined,
    limit: 12,
    offset: 24,
  });
  expect(rpc).not.toHaveBeenCalled();
  expect(from).not.toHaveBeenCalled();
});

it("does not expose a personalized people feed to a visitor", async () => {
  await expect(
    databaseService.getReviews({ followedOnly: true })
  ).resolves.toEqual([]);

  expect(mockGetPublicFeed).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
});

it("qualifies the profile relationship when creating a comment", async () => {
  let selectedColumns = "";
  const pgrst201 = {
    code: "PGRST201",
    message: "Could not embed because more than one relationship was found",
  };
  const newComment = {
    id: 42,
    inserted_at: "2026-09-18T00:00:00Z",
    review_id: 9,
    user_id: "author-1",
    body: "Perfectly cold.",
    profile: { id: "author-1", username: "olivefan" },
  };

  from.mockReturnValue({
    insert: jest.fn(() => ({
      select: jest.fn((columns: string) => {
        selectedColumns = columns;
        return {
          single: jest.fn(async () =>
            columns.includes("profile:profiles!comments_user_id_fkey")
              ? { data: newComment, error: null }
              : { data: null, error: pgrst201 }
          ),
        };
      }),
    })),
  });

  await expect(
    databaseService.createComment({
      review_id: 9,
      user_id: "author-1",
      body: "Perfectly cold.",
    })
  ).resolves.toEqual({
    ...newComment,
    profile: {
      ...newComment.profile,
      avatar_url: null,
      is_verified: false,
      passport_points: null,
    },
    likes_count: 0,
    has_liked: false,
  });
  expect(selectedColumns).toContain("profile:profiles!comments_user_id_fkey");
});

it.each([undefined, null, 0, 500])(
  "decodes newly posted comment points (%s) like loaded comments",
  async (points) => {
    const mention = {
      profileId: "member-2",
      username: "twist",
      start: 7,
      length: 6,
    };
    rpc.mockResolvedValue({
      data: {
        id: 43,
        review_id: 9,
        user_id: "author-1",
        body: "Cheers @twist",
        inserted_at: "2026-09-18T00:00:00Z",
        profile: {
          id: "author-1",
          username: "olive",
          passport_points: points,
          review_count: 2,
        },
        likes_count: 0,
        has_liked: false,
        mentions: [mention],
      },
      error: null,
    });
    await expect(
      databaseService.createComment(
        { review_id: 9, user_id: "author-1", body: "Cheers @twist" },
        [mention]
      )
    ).resolves.toMatchObject({
      profile: {
        id: "author-1",
        passport_points: points ?? null,
        review_count: 2,
      },
      likes_count: 0,
      has_liked: false,
      mentions: [mention],
    });
  }
);

it("normalizes member data on visitor review details and cached feeds", async () => {
  const review = {
    id: "42",
    user_id: "member-1",
    comment: "Cold",
    profile: {
      id: "member-1",
      username: "olive",
      review_count: 2,
      passport_points: 500,
    },
  };
  mockGetPublicReview.mockResolvedValue(review);
  mockGetPublicFeed.mockResolvedValue([review]);
  expect((await databaseService.getReview("42")).profile).toMatchObject({
    passport_points: 500,
    review_count: 2,
    avatar_url: null,
  });
  const first = await databaseService.getReviews({});
  const cached = await databaseService.getReviews({});
  expect(first[0].profile).toMatchObject({
    passport_points: 500,
    avatar_url: null,
  });
  expect(cached).toEqual(first);
});

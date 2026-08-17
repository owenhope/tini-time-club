import databaseService from "../databaseService";
import { supabase } from "@/utils/supabase";

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
  expect(rpc).toHaveBeenCalledWith("feed_reviews", {
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

it("qualifies the profile relationship when creating a comment", async () => {
  let selectedColumns = "";
  const pgrst201 = {
    code: "PGRST201",
    message: "Could not embed because more than one relationship was found",
  };
  const newComment = {
    id: 42,
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
    likes_count: 0,
    has_liked: false,
  });
  expect(selectedColumns).toContain("profile:profiles!comments_user_id_fkey");
});

import { supabase } from "@/utils/supabase";
import { getFollowProfiles, getReviewLikers } from "../memberListService";

jest.mock("@/utils/supabase", () => ({ supabase: { from: jest.fn() } }));
const from = supabase.from as jest.Mock;
const chain = (data: unknown, error: unknown = null) => {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    limit: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.single.mockResolvedValue({ data, error });
  query.limit.mockResolvedValue({ data, error });
  return query;
};
const rows = [
  {
    profiles: {
      id: "member-1",
      username: "olive",
      passport_points: 500,
      review_count: 2,
    },
  },
  { profiles: null },
  { profiles: { id: "member-2", username: "twist", passport_points: 0 } },
  { profiles: { id: "member-3", username: "dry" } },
];
beforeEach(() => from.mockReset());

it("decodes liker identities and distinguishes unknown points from zero", async () => {
  const likes = chain(rows);
  from.mockReturnValue(likes);
  const result = await getReviewLikers("42");
  expect(result.map((member) => member.passport_points)).toEqual([
    500,
    0,
    null,
  ]);
  expect(result[0].review_count).toBe(2);
  expect(likes.eq).toHaveBeenCalledWith("review_id", "42");
  expect(likes.limit).toHaveBeenCalledWith(200);
});

it.each(["followers", "following"] as const)(
  "decodes %s without changing relationship direction",
  async (direction) => {
    const follows = chain(rows);
    from
      .mockReturnValueOnce(chain({ id: "owner-1" }))
      .mockReturnValueOnce(follows);
    const result = await getFollowProfiles("owner", direction);
    expect(result.map((member) => member.passport_points)).toEqual([
      500,
      0,
      null,
    ]);
    expect(follows.eq).toHaveBeenCalledWith(
      direction === "followers" ? "following_id" : "follower_id",
      "owner-1"
    );
    expect(follows.select).toHaveBeenCalledWith(
      expect.stringContaining(
        direction === "followers"
          ? "followers_follower_id_fkey"
          : "followers_following_id_fkey"
      )
    );
  }
);

it("propagates list failures for the screen's retry state", async () => {
  const error = new Error("offline");
  from
    .mockReturnValueOnce(chain({ id: "owner-1" }))
    .mockReturnValueOnce(chain(null, error));
  await expect(getFollowProfiles("owner", "followers")).rejects.toBe(error);
});

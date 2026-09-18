import { supabase } from "@/utils/supabase";
import { getRegularsByLocation } from "../regularsService";
jest.mock("@/utils/supabase", () => ({ supabase: { rpc: jest.fn() } }));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

it("keeps venue placement and review totals independent from cached Passport points", async () => {
  const rpc = supabase.rpc as jest.Mock;
  rpc.mockResolvedValue({
    data: [
      {
        location_id: 42,
        rank: 1,
        profile_id: "member-1",
        username: "olive",
        review_count: 3,
        profile_review_count: 20,
        passport_points: 500,
      },
      {
        location_id: 42,
        rank: 2,
        profile_id: "member-2",
        username: "twist",
        review_count: 2,
        passport_points: 0,
      },
      {
        location_id: 42,
        rank: 3,
        profile_id: "member-3",
        username: "dry",
        review_count: 1,
      },
      { location_id: 42, rank: 4, profile_id: " ", review_count: 1 },
    ],
    error: null,
  });
  const regulars = (await getRegularsByLocation([42], { maxAgeMs: 0 })).get(
    "42"
  )!;
  expect(regulars.map((member) => member.passport_points)).toEqual([
    500,
    0,
    null,
  ]);
  expect(regulars[0]).toMatchObject({
    rank: 1,
    review_count: 3,
    profile_review_count: 20,
  });
  const cached = await getRegularsByLocation([42]);
  expect(cached.get("42")).toEqual(regulars);
  expect(rpc).toHaveBeenCalledTimes(1);
});

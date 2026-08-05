jest.mock("@/utils/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock("@/services/regularsService", () => ({
  getRegularsByLocation: jest.fn(),
}));

import { collectAchievements } from "@/utils/celebrations";
import { RANK_TIERS } from "@/utils/ranking";

describe("collectAchievements", () => {
  it("returns rank and newly earned Regular achievements in order", () => {
    expect(
      collectAchievements({
        rankUp: RANK_TIERS[1],
        wasRegular: false,
        isRegular: true,
        locationId: 42,
        locationName: "  The Lounge  ",
      })
    ).toEqual([
      { kind: "rank", tier: RANK_TIERS[1] },
      { kind: "regular", locationId: 42, locationName: "The Lounge" },
    ]);
  });

  it("does not celebrate a Regular position the member already held", () => {
    expect(
      collectAchievements({
        rankUp: null,
        wasRegular: true,
        isRegular: true,
        locationId: 42,
        locationName: "The Lounge",
      })
    ).toEqual([]);
  });

  it("requires a valid location before creating a Regular achievement", () => {
    expect(
      collectAchievements({
        rankUp: null,
        wasRegular: false,
        isRegular: true,
        locationId: null,
        locationName: null,
      })
    ).toEqual([]);
  });

  it("does not infer a new Regular position from an unknown prior state", () => {
    expect(
      collectAchievements({
        rankUp: null,
        wasRegular: null,
        isRegular: true,
        locationId: 42,
        locationName: "The Lounge",
      })
    ).toEqual([]);
  });
});

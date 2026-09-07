import {
  buildTierDistribution,
  buildTierDistributionFromCounts,
} from "../analyticsModels";

describe("admin rank distribution", () => {
  it("places profiles at the correct Passport-point boundaries", () => {
    expect(
      buildTierDistribution([
        { passport_points: 0 },
        { passport_points: 49 },
        { passport_points: 50 },
        { passport_points: 499 },
        { passport_points: 500 },
        { passport_points: 1000 },
        { passport_points: null },
      ])
    ).toEqual([
      {
        tier: "Well",
        color: "#B4783A",
        count: 3,
        min: 0,
        max: 49,
        next: { tier: "Call", min: 50 },
      },
      {
        tier: "Call",
        color: "#9BA6B2",
        count: 2,
        min: 50,
        max: 499,
        next: { tier: "Premium", min: 500 },
      },
      {
        tier: "Premium",
        color: "#D4AF37",
        count: 1,
        min: 500,
        max: 999,
        next: { tier: "Top Shelf", min: 1000 },
      },
      {
        tier: "Top Shelf",
        color: "#8E7CE8",
        count: 1,
        min: 1000,
        max: null,
        next: null,
      },
    ]);
  });

  it("preserves tier metadata for database-aggregated counts", () => {
    expect(buildTierDistributionFromCounts([3, 2, 1, 1])).toEqual(
      buildTierDistribution([
        { passport_points: 0 },
        { passport_points: 49 },
        { passport_points: 50 },
        { passport_points: 499 },
        { passport_points: 500 },
        { passport_points: 1000 },
        { passport_points: null },
      ])
    );
  });
});

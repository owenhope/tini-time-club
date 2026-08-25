import {
  buildTierDistribution,
  buildTierDistributionFromCounts,
} from "../analyticsModels";

describe("admin rank distribution", () => {
  it("places profiles at the correct tier boundaries", () => {
    expect(
      buildTierDistribution([
        { review_count: 0 },
        { review_count: 9 },
        { review_count: 10 },
        { review_count: 49 },
        { review_count: 50 },
        { review_count: 150 },
        { review_count: null },
      ])
    ).toEqual([
      {
        tier: "Well",
        color: "#B4783A",
        count: 3,
        min: 0,
        max: 9,
        next: { tier: "Call", min: 10 },
      },
      {
        tier: "Call",
        color: "#9BA6B2",
        count: 2,
        min: 10,
        max: 49,
        next: { tier: "Premium", min: 50 },
      },
      {
        tier: "Premium",
        color: "#D4AF37",
        count: 1,
        min: 50,
        max: 149,
        next: { tier: "Top Shelf", min: 150 },
      },
      {
        tier: "Top Shelf",
        color: "#8E7CE8",
        count: 1,
        min: 150,
        max: null,
        next: null,
      },
    ]);
  });

  it("preserves tier metadata for database-aggregated counts", () => {
    expect(buildTierDistributionFromCounts([3, 2, 1, 1])).toEqual(
      buildTierDistribution([
        { review_count: 0 },
        { review_count: 9 },
        { review_count: 10 },
        { review_count: 49 },
        { review_count: 50 },
        { review_count: 150 },
        { review_count: null },
      ])
    );
  });
});

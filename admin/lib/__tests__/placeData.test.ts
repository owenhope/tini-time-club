import { normalizeGoldenGlassInspectionRows } from "../placeModels";

describe("admin place data normalization", () => {
  it("converts inspection RPC numerics without changing eligibility fields", () => {
    expect(
      normalizeGoldenGlassInspectionRows([
        {
          region_id: "4",
          location_id: "17",
          calculated_rank: "2",
          raw_overall: "4.75",
          adjusted_score: "4.6",
          distinct_reviewers: "3",
          is_current: true,
          venue_name: "The Gull",
          eligible: false,
          ineligibility_reason: "Not enough distinct reviewers",
        },
      ])
    ).toEqual([
      {
        region_id: 4,
        location_id: 17,
        calculated_rank: 2,
        raw_overall: 4.75,
        adjusted_score: 4.6,
        distinct_reviewers: 3,
        is_current: true,
        venue_name: "The Gull",
        eligible: false,
        ineligibility_reason: "Not enough distinct reviewers",
      },
    ]);
  });
});

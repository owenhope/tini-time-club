import { normalizeSharePreviewReviews } from "../sharePreviewModels";

describe("admin share preview normalization", () => {
  it("keeps active profiles, unwraps relations, and removes deleted profiles", () => {
    expect(
      normalizeSharePreviewReviews([
        {
          id: 17,
          comment: "Bright and cold",
          inserted_at: "2026-08-25T10:00:00Z",
          taste: 4,
          presentation: 5,
          location: [{ name: "The Gull" }],
          profile: [{ username: "olive", deleted: false }],
        },
        {
          id: 18,
          comment: "Hidden",
          inserted_at: "2026-08-25T09:00:00Z",
          taste: 3,
          presentation: 3,
          location: { name: "Closed Bar" },
          profile: { username: "gone", deleted: true },
        },
      ])
    ).toEqual([
      {
        id: "17",
        comment: "Bright and cold",
        inserted_at: "2026-08-25T10:00:00Z",
        taste: 4,
        presentation: 5,
        location: { name: "The Gull" },
        profile: { username: "olive" },
      },
    ]);
  });
});

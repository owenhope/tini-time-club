import { normalizeProfile } from "../normalizeProfile";

it("preserves onboarding and settings while normalizing member display fields", () => {
  expect(
    normalizeProfile({
      id: "member",
      username: "",
      bio: "Hello",
      eula_accepted: false,
      favorite_spirits: [1],
      review_count: 200,
    })
  ).toEqual({
    id: "member",
    username: "",
    bio: "Hello",
    eula_accepted: false,
    favorite_spirits: [1],
    review_count: 200,
    avatar_url: null,
    is_verified: false,
    passport_points: null,
  });
});

it.each([null, undefined, NaN, -1, 0, 500])(
  "normalizes points (%s) without using review totals",
  (points) => {
    const result = normalizeProfile({
      id: "member",
      username: "olive",
      passport_points: points,
      review_count: 900,
    });
    expect(result.passport_points).toBe(
      typeof points === "number" && Number.isFinite(points) && points >= 0
        ? points
        : null
    );
    expect(result.review_count).toBe(900);
  }
);

it("rejects profiles without a usable identity", () => {
  expect(() => normalizeProfile({ id: " ", username: "olive" })).toThrow(
    "Invalid profile identity"
  );
});

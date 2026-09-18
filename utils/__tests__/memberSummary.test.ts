import { decodeMemberSummary } from "../memberSummary";

it("uses safe avatar defaults without turning malformed points into Well", () => {
  expect(
    decodeMemberSummary({
      id: "member-1",
      username: null,
      avatar_url: {},
      is_verified: "true",
      passport_points: "500",
      review_count: -1,
    })
  ).toEqual({
    id: "member-1",
    username: "Unknown",
    avatar_url: null,
    is_verified: false,
    passport_points: null,
  });
});

it.each([null, undefined, {}, { id: 12 }, { id: " " }])(
  "rejects missing member identity (%s)",
  (value) => {
    expect(decodeMemberSummary(value)).toBeNull();
  }
);

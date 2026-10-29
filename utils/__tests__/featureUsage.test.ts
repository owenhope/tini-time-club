import { createScreenVisitTracker, screenUsageEvent } from "../featureUsage";

it.each([
  ["/home", "screen_home"],
  ["/(tabs)/(home,discover,profile)/passport", "screen_passport"],
  ["/places/123", "screen_venue"],
  ["/users/private-name", "screen_member"],
  ["/users/private-name/followers", "screen_followers"],
  ["/profile", "screen_profile"],
  ["/r/42", "screen_review_detail"],
  ["/auth/callback", null],
  ["/unknown", null],
])("maps %s to a coarse event", (path, expected) => {
  expect(screenUsageEvent(path)).toBe(expected);
});

it("counts navigation, not rerenders, and permits return visits and different venues", () => {
  const capture = jest.fn();
  const track = createScreenVisitTracker(capture);
  [
    "/home",
    "/home",
    "/places/1",
    "/places/2",
    "/home",
    "/membership",
    "/home",
  ].forEach(track);
  expect(capture.mock.calls.map(([event]) => event)).toEqual([
    "screen_home",
    "screen_venue",
    "screen_venue",
    "screen_home",
    "screen_home",
  ]);
  expect(JSON.stringify(capture.mock.calls)).not.toContain("/places");
});

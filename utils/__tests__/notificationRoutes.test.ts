import { getNotificationRouteFromData } from "@/utils/notificationRoutes";

describe("getNotificationRouteFromData", () => {
  it.each([
    "/home",
    "/places",
    "/places/42",
    "/users/martini_fan",
    "/r/42?comments=1",
  ])("accepts the internal route %s", (url) => {
    expect(getNotificationRouteFromData({ url })).toBe(url);
  });

  it.each([
    "https://example.com/phishing",
    "//example.com",
    "/places/not-a-number",
    "/settings",
    "/users/name/extra",
    "/r/not-a-review?comments=1",
    "/r/42?comments=0",
    "/r/42?comments=1&admin=true",
  ])("rejects the route %s", (url) => {
    expect(getNotificationRouteFromData({ url })).toBeNull();
  });

  it("rejects missing and non-string URLs", () => {
    expect(getNotificationRouteFromData(undefined)).toBeNull();
    expect(getNotificationRouteFromData({ url: 42 })).toBeNull();
  });
});

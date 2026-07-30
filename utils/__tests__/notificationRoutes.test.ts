import { getNotificationRouteFromData } from "@/utils/notificationRoutes";

describe("getNotificationRouteFromData", () => {
  it.each(["/home", "/places", "/places/42", "/users/martini_fan"])(
    "accepts the internal route %s",
    (url) => {
      expect(getNotificationRouteFromData({ url })).toBe(url);
    }
  );

  it.each([
    "https://example.com/phishing",
    "//example.com",
    "/places/not-a-number",
    "/settings",
    "/users/name/extra",
  ])("rejects the route %s", (url) => {
    expect(getNotificationRouteFromData({ url })).toBeNull();
  });

  it("rejects missing and non-string URLs", () => {
    expect(getNotificationRouteFromData(undefined)).toBeNull();
    expect(getNotificationRouteFromData({ url: 42 })).toBeNull();
  });
});

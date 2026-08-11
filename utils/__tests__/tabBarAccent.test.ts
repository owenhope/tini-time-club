import { getTabBarAccentForPath } from "@/utils/tabBarAccent";

describe("getTabBarAccentForPath", () => {
  it.each(["/home", "/discover", "/places", "/settings", "/place-info"])(
    "uses green for %s",
    (pathname) => {
      expect(getTabBarAccentForPath(pathname)).toBe("green");
    }
  );

  it.each([
    "/profile",
    "/places/42",
    "/users/owen",
    "/users/owen/followers",
    "/r/123",
  ])("uses purple for %s", (pathname) => {
    expect(getTabBarAccentForPath(pathname)).toBe("purple");
  });
});

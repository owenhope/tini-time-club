import { getSwipeTabDestination } from "@/utils/tabSwipe";

describe("getSwipeTabDestination", () => {
  it("advances from Feed to Explore on a left swipe", () => {
    expect(getSwipeTabDestination("/home", -100)).toBe("/discover");
  });

  it("moves backward from Explore to Feed on a right swipe", () => {
    expect(getSwipeTabDestination("/discover", 100)).toBe("/home");
  });

  it("traverses Index and Profile in the same direction", () => {
    expect(getSwipeTabDestination("/discover", -100)).toBe("/martini-index");
    expect(getSwipeTabDestination("/martini-index", -100)).toBe("/profile");
    expect(getSwipeTabDestination("/profile", 100)).toBe("/martini-index");
  });

  it("does not navigate past the tab edges or from Review/detail routes", () => {
    expect(getSwipeTabDestination("/home", 100)).toBeNull();
    expect(getSwipeTabDestination("/profile", -100)).toBeNull();
    expect(getSwipeTabDestination("/review", 100)).toBeNull();
    expect(getSwipeTabDestination("/settings", -100)).toBeNull();
  });

  it("ignores short horizontal movement", () => {
    expect(getSwipeTabDestination("/home", -63)).toBeNull();
  });
});

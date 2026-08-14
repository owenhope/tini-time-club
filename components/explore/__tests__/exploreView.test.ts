import { resolveExploreView } from "@/components/explore/exploreView";

describe("resolveExploreView", () => {
  it.each(["map", "places", "members"] as const)(
    "accepts the canonical %s view",
    (view) => {
      expect(resolveExploreView({ view })).toBe(view);
    }
  );

  it("keeps old member links working", () => {
    expect(resolveExploreView({ tab: "members" })).toBe("members");
  });

  it("defaults old and invalid links to the map", () => {
    expect(resolveExploreView({})).toBe("map");
    expect(resolveExploreView({ view: "unknown", tab: "places" })).toBe("map");
  });

  it("lets the canonical view override a legacy tab param", () => {
    expect(resolveExploreView({ view: "places", tab: "members" })).toBe(
      "places"
    );
  });
});

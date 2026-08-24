import { resolveExploreView } from "@/components/explore/exploreView";

describe("resolveExploreView", () => {
  it.each(["map", "golden-glass", "members"] as const)(
    "accepts the canonical %s view",
    (view) => {
      expect(resolveExploreView({ view })).toBe(view);
    }
  );

  it("keeps old member links working", () => {
    expect(resolveExploreView({ tab: "members" })).toBe("members");
  });

  it("maps the old Top Places links to Golden Glass", () => {
    expect(resolveExploreView({})).toBe("map");
    expect(resolveExploreView({ view: "unknown", tab: "places" })).toBe(
      "golden-glass"
    );
  });

  it("lets the canonical view override a legacy tab param", () => {
    expect(resolveExploreView({ view: "places", tab: "members" })).toBe(
      "golden-glass"
    );
  });
});

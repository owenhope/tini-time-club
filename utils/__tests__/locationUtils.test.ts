import {
  calculateDistance,
  formatDistance,
  getNameMatchScore,
  filterRelevantPlaces,
  deduplicatePlaces,
  getRelevantPlaceTypes,
} from "../locationUtils";

describe("calculateDistance", () => {
  it("returns zero for identical coordinates", () => {
    expect(calculateDistance(49.2827, -123.1207, 49.2827, -123.1207)).toBe(0);
  });

  it("computes a known distance (Vancouver to Seattle ~190km)", () => {
    const km = calculateDistance(49.2827, -123.1207, 47.6062, -122.3321);
    expect(km).toBeGreaterThan(180);
    expect(km).toBeLessThan(200);
  });

  it("is symmetric", () => {
    const a = calculateDistance(49.28, -123.12, 47.6, -122.33);
    const b = calculateDistance(47.6, -122.33, 49.28, -123.12);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("formatDistance", () => {
  it("uses metres below 1km", () => {
    expect(formatDistance(0.4)).toMatch(/m$/);
  });

  it("uses kilometres at or above 1km", () => {
    expect(formatDistance(5.2)).toMatch(/km$/);
  });
});

describe("getNameMatchScore", () => {
  it("scores an exact match above a partial one", () => {
    expect(getNameMatchScore("Keefer Bar", "Keefer Bar")).toBeGreaterThan(
      getNameMatchScore("Keefer Bar", "Keefer")
    );
  });

  it("scores an unrelated name lowest", () => {
    expect(getNameMatchScore("Keefer Bar", "Keefer")).toBeGreaterThan(
      getNameMatchScore("Keefer Bar", "Pizza Hut")
    );
  });
});

describe("filterRelevantPlaces", () => {
  it("keeps places that serve alcohol and drops those that do not", () => {
    const places = [
      { name: "A Bar", types: ["bar"] },
      { name: "A Laundromat", types: ["laundry"] },
      { name: "A Restaurant", types: ["restaurant"] },
    ];
    const names = filterRelevantPlaces(places).map((p: any) => p.name);
    expect(names).toContain("A Bar");
    expect(names).toContain("A Restaurant");
    expect(names).not.toContain("A Laundromat");
  });

  it("handles an empty list", () => {
    expect(filterRelevantPlaces([])).toEqual([]);
  });
});

describe("deduplicatePlaces", () => {
  it("removes repeated place_ids, keeping one entry", () => {
    const places = [
      { place_id: "x", name: "Bar" },
      { place_id: "x", name: "Bar" },
      { place_id: "y", name: "Other" },
    ];
    expect(deduplicatePlaces(places)).toHaveLength(2);
  });
});

// Note: this is a display formatter for Google Places types, not a
// relevance filter — it strips Google's generic categories and title-cases
// whatever remains.
describe("getRelevantPlaceTypes", () => {
  it("title-cases types for display", () => {
    expect(getRelevantPlaceTypes(["night_club"])).toEqual(["Night Club"]);
  });

  it("drops Google's generic categories", () => {
    expect(
      getRelevantPlaceTypes(["bar", "point_of_interest", "establishment"])
    ).toEqual(["Bar"]);
  });

  it("handles undefined input", () => {
    expect(getRelevantPlaceTypes(undefined)).toEqual([]);
  });
});

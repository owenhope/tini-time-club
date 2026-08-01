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
  const place = (name: string, types: string[]) => ({ name, types });

  it("keeps cocktail venues", () => {
    const names = filterRelevantPlaces([
      place("A Bar", ["bar", "point_of_interest", "establishment"]),
      place("A Restaurant", ["restaurant", "food", "establishment"]),
      place("A Club", ["bar", "food", "night_club", "establishment"]),
    ]).map((p: any) => p.name);
    expect(names).toEqual(["A Bar", "A Restaurant", "A Club"]);
  });

  it("keeps hotel bars (Google types hotels as lodging, not hotel)", () => {
    // Regression: the old include-list said "hotel", which Google never
    // returns, so hotel venues were silently unfindable in search.
    const kept = filterRelevantPlaces([
      place("The Mosser Hotel", [
        "establishment",
        "lodging",
        "point_of_interest",
      ]),
    ]);
    expect(kept.map((p: any) => p.name)).toEqual(["The Mosser Hotel"]);
  });

  it("keeps venue types outside the query list (wineries etc.)", () => {
    const kept = filterRelevantPlaces([
      place("A Winery", ["establishment", "point_of_interest", "food"]),
    ]);
    expect(kept).toHaveLength(1);
  });

  it("drops geography and transit", () => {
    // Regression: invalid type params made the legacy API return prominence
    // results, including the city itself — which became selectable.
    const kept = filterRelevantPlaces([
      place("San Francisco", ["locality", "political"]),
      place("Mission District", ["neighborhood", "political"]),
      place("Market Street", ["route"]),
      place("Powell Station", [
        "transit_station",
        "establishment",
        "point_of_interest",
      ]),
      place("SFO", ["airport", "establishment", "point_of_interest"]),
    ]);
    expect(kept).toHaveLength(0);
  });

  it("drops results with no establishment tag", () => {
    const kept = filterRelevantPlaces([
      place("Golden Gate Park", ["park", "point_of_interest"]),
      place("Untyped", []),
      { name: "No types at all" },
    ]);
    expect(kept).toHaveLength(0);
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

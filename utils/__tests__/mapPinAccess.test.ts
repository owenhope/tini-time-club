import { canOpenMapPinDetails } from "@/utils/mapPinAccess";

describe("map pin visitor boundary", () => {
  it("does not allow a visitor pin press to select or reveal a location", () => {
    expect(canOpenMapPinDetails(false)).toBe(false);
  });

  it("preserves member map detail behavior", () => {
    expect(canOpenMapPinDetails(true)).toBe(true);
  });
});

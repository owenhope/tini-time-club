import {
  calculateOverallRating,
  formatRating,
  getLocationOverallRating,
  getLocationRatingDisplay,
  isSelectableRating,
} from "../ratingUtils";

describe("isSelectableRating", () => {
  it.each([1, 1.5, 2.5, 4.5, 5])("accepts %s", (rating) => {
    expect(isSelectableRating(rating)).toBe(true);
  });

  it.each([0, 0.5, -0.5, 1.25, 4.75, 5.5, Number.NaN])(
    "rejects %s",
    (rating) => {
      expect(isSelectableRating(rating)).toBe(false);
    }
  );
});

describe("calculateOverallRating", () => {
  it("averages taste and presentation", () => {
    expect(calculateOverallRating(4, 2)).toBe(3);
  });

  it("returns null when either input is missing", () => {
    expect(calculateOverallRating(undefined, 2)).toBeNull();
    expect(calculateOverallRating(4, undefined)).toBeNull();
  });

  it("treats a zero rating as a real value, not a missing one", () => {
    expect(calculateOverallRating(0, 0)).toBe(0);
  });
});

describe("formatRating", () => {
  it("formats to one decimal place by default", () => {
    expect(formatRating(3.456)).toBe("3.5");
  });

  it("honours an explicit precision", () => {
    expect(formatRating(3.456, 2)).toBe("3.46");
  });

  it('renders "N/A" for null and undefined', () => {
    expect(formatRating(null)).toBe("N/A");
    expect(formatRating(undefined)).toBe("N/A");
  });

  it("formats zero rather than treating it as missing", () => {
    expect(formatRating(0)).toBe("0.0");
  });
});

describe("getLocationOverallRating", () => {
  it("prefers a precomputed rating", () => {
    expect(
      getLocationOverallRating({
        rating: 4.2,
        taste_avg: 1,
        presentation_avg: 1,
      })
    ).toBe(4.2);
  });

  it("falls back to computing from taste and presentation", () => {
    expect(
      getLocationOverallRating({ taste_avg: 5, presentation_avg: 3 })
    ).toBe(4);
  });

  it("returns null when there is nothing to compute from", () => {
    expect(getLocationOverallRating({})).toBeNull();
  });
});

describe("getLocationRatingDisplay", () => {
  it("formats a computed rating", () => {
    expect(
      getLocationRatingDisplay({ taste_avg: 4, presentation_avg: 3 })
    ).toBe("3.5");
  });

  it('shows "N/A" for an unrated location', () => {
    expect(getLocationRatingDisplay({})).toBe("N/A");
  });
});

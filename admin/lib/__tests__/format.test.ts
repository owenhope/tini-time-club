import { formatOverallRating } from "../format";

describe("formatOverallRating", () => {
  it("formats the average of taste and presentation to one decimal", () => {
    expect(formatOverallRating(4.8, 4.6)).toBe("4.7");
  });

  it("uses the admin placeholder when either score is missing", () => {
    expect(formatOverallRating(null, 4.6)).toBe("—");
    expect(formatOverallRating(4.8, null)).toBe("—");
  });
});

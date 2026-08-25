import {
  formatAdminDate,
  formatAdminDateTime,
  formatOverallRating,
} from "../format";

describe("formatOverallRating", () => {
  it("formats the average of taste and presentation to one decimal", () => {
    expect(formatOverallRating(4.8, 4.6)).toBe("4.7");
  });

  it("uses the admin placeholder when either score is missing", () => {
    expect(formatOverallRating(null, 4.6)).toBe("—");
    expect(formatOverallRating(4.8, null)).toBe("—");
  });
});

describe("admin date formatters", () => {
  it("formats dates and date-times using the local browser format", () => {
    const value = "2026-08-24T22:13:18.000Z";

    expect(formatAdminDate(value)).toBe(new Date(value).toLocaleDateString());
    expect(formatAdminDateTime(value)).toBe(new Date(value).toLocaleString());
  });

  it("uses the admin placeholder for missing dates", () => {
    expect(formatAdminDate(null)).toBe("—");
    expect(formatAdminDateTime(undefined)).toBe("—");
  });
});

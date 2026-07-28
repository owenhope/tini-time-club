import { stripNameFromAddress, formatRelativeDate } from "../helpers";

describe("stripNameFromAddress", () => {
  it("removes a leading venue name and separator", () => {
    expect(
      stripNameFromAddress("The Keefer Bar", "The Keefer Bar, 135 Keefer St")
    ).toBe("135 Keefer St");
  });

  it("matches case-insensitively", () => {
    expect(
      stripNameFromAddress("the keefer bar", "The Keefer Bar, 135 Keefer St")
    ).toBe("135 Keefer St");
  });

  it("leaves the address alone when it does not start with the name", () => {
    expect(stripNameFromAddress("The Keefer Bar", "135 Keefer St")).toBe(
      "135 Keefer St"
    );
  });

  it("returns the address unchanged when either argument is empty", () => {
    expect(stripNameFromAddress("", "135 Keefer St")).toBe("135 Keefer St");
    expect(stripNameFromAddress("Bar", "")).toBe("");
  });
});

describe("formatRelativeDate", () => {
  const NOW = new Date("2026-07-27T12:00:00Z").getTime();

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  it("reports minutes", () => {
    expect(formatRelativeDate(ago(5 * 60_000))).toBe("5 minutes ago");
  });

  it("singularises a one-unit interval", () => {
    expect(formatRelativeDate(ago(60_000))).toBe("1 minute ago");
    expect(formatRelativeDate(ago(60 * 60_000))).toBe("1 hour ago");
  });

  it("reports hours, days and weeks at the right boundaries", () => {
    expect(formatRelativeDate(ago(3 * 60 * 60_000))).toBe("3 hours ago");
    expect(formatRelativeDate(ago(2 * 24 * 60 * 60_000))).toBe("2 days ago");
    expect(formatRelativeDate(ago(14 * 24 * 60 * 60_000))).toBe("2 weeks ago");
  });

  it("falls back to an absolute date beyond a year", () => {
    expect(formatRelativeDate(ago(400 * 24 * 60 * 60_000))).toMatch(
      /\w{3} \d{1,2}, \d{4}/
    );
  });
});

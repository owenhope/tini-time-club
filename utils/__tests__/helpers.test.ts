import {
  stripNameFromAddress,
  formatRelativeDate,
  formatCityRegion,
} from "../helpers";

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

// Cases taken from real rows in the locations table.
describe("formatCityRegion", () => {
  it.each([
    [
      "855 Main St, West Vancouver, BC V7T 0A5, Canada",
      "West Vancouver, Canada",
    ],
    [
      "201 Concourse Blvd, Dresher, PA 19025, United States",
      "Dresher, United States",
    ],
    ["4238 Wilson Blvd #1130, Arlington, VA 22203, USA", "Arlington, USA"],
    [
      "Como Taperia, East 7th Avenue, Vancouver, BC, Canada",
      "Vancouver, Canada",
    ],
    [
      "SIDECUT Steakhouse, Blackcomb Way, Whistler, BC, Canada",
      "Whistler, Canada",
    ],
    [
      "Castelli's Ristorante, California 111, Palm Desert, CA, USA",
      "Palm Desert, USA",
    ],
    ["1038 Canada Pl, Vancouver, BC V6C 0E2, Canada", "Vancouver, Canada"],
  ])("reduces %s to city and country", (input, expected) => {
    expect(formatCityRegion(input)).toBe(expected);
  });

  it("handles an address whose city carries no region code", () => {
    expect(
      formatCityRegion(
        "76/8-9 Soi Si Bamphen, Thung Maha Mek, Sathon, Bangkok 10120, Thailand"
      )
    ).toBe("Bangkok, Thailand");
  });

  it("keeps Turkish district and city slash pairs without postal clutter", () => {
    expect(formatCityRegion("34710 Kadikoy/Istanbul, Caferaga Mahallesi")).toBe(
      "Kadikoy, Istanbul"
    );
  });

  it("finds Turkish district and city slash pairs after a venue prefix", () => {
    expect(
      formatCityRegion(
        "Elephant Pub Kadikoy, 34710 Kadiköy/İstanbul, Caferağa Mahallesi"
      )
    ).toBe("Kadiköy, İstanbul");
  });

  it("uses the city side of a Turkish slash pair when country is present", () => {
    expect(
      formatCityRegion("Elephant Pub Kadikoy, 34710 Kadiköy/İstanbul, Türkiye")
    ).toBe("İstanbul, Türkiye");
  });

  it("does not mistake a street for a city in a two-part address", () => {
    expect(formatCityRegion("401 Main Street, Columbia")).toBe("Columbia");
  });

  it("keeps a genuine two-part city and region when no country is given", () => {
    expect(formatCityRegion("Vancouver, BC")).toBe("Vancouver, BC");
  });

  it("returns an empty string for missing input", () => {
    expect(formatCityRegion(null)).toBe("");
    expect(formatCityRegion(undefined)).toBe("");
    expect(formatCityRegion("")).toBe("");
  });
});

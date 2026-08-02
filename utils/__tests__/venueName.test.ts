import { normalizeVenueName } from "@/utils/venueName";

describe("normalizeVenueName", () => {
  it("title-cases a shouted name", () => {
    expect(normalizeVenueName("COPPER CHIMNEY INDIAN RESTAURANT")).toBe(
      "Copper Chimney Indian Restaurant"
    );
  });

  it("leaves short all-caps tokens and names with digits alone", () => {
    expect(normalizeVenueName("ONE65 SF")).toBe("ONE65 SF");
  });

  it("drops joiners to lowercase inside the name", () => {
    expect(normalizeVenueName("O' BY CLAUDE LE TOHIC")).toBe(
      "O' by Claude Le Tohic"
    );
  });

  it("keeps a leading joiner capitalised", () => {
    expect(normalizeVenueName("THE AVIARY")).toBe("The Aviary");
  });

  it("leaves a name that isn't shouting untouched", () => {
    expect(normalizeVenueName("Copper Spirit Distillery")).toBe(
      "Copper Spirit Distillery"
    );
    expect(normalizeVenueName("BarChef")).toBe("BarChef");
  });

  it("capitalises after apostrophes and hyphens", () => {
    expect(normalizeVenueName("O'BRIEN'S PUB")).toBe("O'Brien's Pub");
    expect(normalizeVenueName("JEAN-LUC BISTRO")).toBe("Jean-Luc Bistro");
  });

  it("collapses whitespace and handles empty input", () => {
    expect(normalizeVenueName("  THE   GIBSON  ")).toBe("The Gibson");
    expect(normalizeVenueName(null)).toBe("");
  });
});

import {
  filterMartiniIndex,
  getEligibleMartinis,
  getMartiniIndexRows,
  MARTINI_GUIDE_NOTES,
  MARTINI_INDEX,
  MARTINI_SPIRITS,
  MARTINI_TYPES,
  pickMartiniIndexEntry,
} from "@/utils/martini-index";

describe("martini index", () => {
  it("contains twelve unique, supported spirit and type combinations", () => {
    expect(MARTINI_INDEX).toHaveLength(12);
    expect(new Set(MARTINI_INDEX.map((item) => item.id)).size).toBe(12);

    for (const item of MARTINI_INDEX) {
      expect(MARTINI_SPIRITS).toContain(item.spirit);
      expect(MARTINI_TYPES).toContain(item.type);
      expect(item.image).toBeTruthy();
    }
  });

  it("filters the index by text and spirit", () => {
    expect(filterMartiniIndex("espresso").map((item) => item.id)).toEqual([
      "espresso-vodka",
    ]);
    expect(
      filterMartiniIndex("olive", "Gin").every((item) => item.spirit === "Gin")
    ).toBe(true);
    expect(filterMartiniIndex("olive", "Gin").length).toBeGreaterThan(0);
  });

  it("keeps suggested orders natural by omitting implied defaults", () => {
    for (const item of MARTINI_INDEX) {
      expect(item.order.toLowerCase()).not.toMatch(/\b(?:served )?up\b/);
      expect(item.order.toLowerCase()).not.toMatch(/\bclassic\b/);
    }
  });

  it("does not repeat the drink title in its description", () => {
    for (const item of MARTINI_INDEX) {
      expect(item.description).not.toMatch(/\bmartini\b/i);
    }
  });

  it("spaces five guide notes through the full index but not spirit filters", () => {
    const fullIndex = getMartiniIndexRows();
    const vodkaIndex = getMartiniIndexRows("Vodka");

    expect(fullIndex).toHaveLength(17);
    expect(fullIndex.filter((entry) => entry.kind === "guide")).toHaveLength(5);
    expect(MARTINI_GUIDE_NOTES.map((note) => note.id)).toEqual(
      expect.arrayContaining(["neat-vs-up", "twist-or-olive"])
    );
    expect(vodkaIndex.every((entry) => entry.kind === "drink")).toBe(true);
  });

  it("removes every disliked spirit and type", () => {
    const eligible = getEligibleMartinis({
      spirits: ["Vodka"],
      types: ["Dirty", "Classic"],
    });

    expect(eligible.every((item) => item.spirit !== "Vodka")).toBe(true);
    expect(eligible.every((item) => item.type !== "Dirty")).toBe(true);
    expect(eligible.every((item) => item.type !== "Classic")).toBe(true);
  });

  it("picks deterministically and avoids an immediate repeat", () => {
    const avoidances = { spirits: ["Vodka", "Vesper"] as const, types: [] };
    const first = pickMartiniIndexEntry(avoidances, null, () => 0);
    const second = pickMartiniIndexEntry(avoidances, first?.id, () => 0);

    expect(first?.id).toBe("classic-gin");
    expect(second?.id).not.toBe(first?.id);
  });

  it("returns null when every spirit is excluded", () => {
    expect(
      pickMartiniIndexEntry(
        { spirits: MARTINI_SPIRITS, types: [] },
        null,
        () => 0
      )
    ).toBeNull();
  });
});

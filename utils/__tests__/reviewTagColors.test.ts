import { getReviewTagColors } from "../reviewTagColors";

describe("review tag colors", () => {
  it.each([
    ["Vesper", "#426B8A"],
    ["TWIST", "#F2FF71"],
    ["VODKA", "#EA6360"],
    [" gin ", "#E8763D"],
    ["Dirty", "#667A3E"],
    ["Espresso", "#6F4518"],
  ])("maps %s to its brand color", (name, backgroundColor) => {
    expect(getReviewTagColors(name)?.backgroundColor).toBe(backgroundColor);
  });

  it("leaves unlisted tags on their component default", () => {
    expect(getReviewTagColors("Classic")).toBeNull();
  });

  it("uses white text on the Vodka tag", () => {
    expect(getReviewTagColors("Vodka")?.textColor).toBe("#FFFFFF");
  });
});

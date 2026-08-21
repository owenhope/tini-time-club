import { getReviewTagColors } from "../reviewTagColors";

describe("review tag colors", () => {
  it.each([
    ["Vesper", "#426B8A"],
    ["Classic", "#2F5D50"],
    ["TWIST", "#F2FF71"],
    ["VODKA", "#EA6360"],
    [" gin ", "#E8763D"],
    ["Dirty", "#667A3E"],
    ["Dry", "#D7E7E2"],
    ["Wet", "#5E8C7F"],
    ["Gibson", "#DCE0C8"],
    ["Filthy", "#394623"],
    ["50/50", "#B8A4D8"],
    ["Espresso", "#6F4518"],
  ])("maps %s to its brand color", (name, backgroundColor) => {
    expect(getReviewTagColors(name)?.backgroundColor).toBe(backgroundColor);
  });

  it("leaves unlisted tags on their component default", () => {
    expect(getReviewTagColors("Lemon Twist")).toBeNull();
  });

  it("uses white text on the Vodka tag", () => {
    expect(getReviewTagColors("Vodka")?.textColor).toBe("#FFFFFF");
  });
});

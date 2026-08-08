import { darkMapStyle, mapStyle } from "../mapStyle";

const firstStyleColor = (entry: (typeof darkMapStyle)[number]) =>
  entry.stylers.find((styler) => "color" in styler)?.color;

const firstColorFor = (style: typeof darkMapStyle, featureType?: string) => {
  const entry = style.find((item) => item.featureType === featureType);
  return entry ? firstStyleColor(entry) : undefined;
};

describe("map styles", () => {
  it("keeps a separate dark map palette", () => {
    expect(darkMapStyle).not.toEqual(mapStyle);
    expect(firstStyleColor(darkMapStyle[0])).toBe("#0E1712");
    expect(firstColorFor(darkMapStyle, "road")).toBe("#1E3229");
    expect(firstColorFor(darkMapStyle, "water")).toBe("#08110D");
  });
});

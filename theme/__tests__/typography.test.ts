import { fonts, typography } from "../tokens";

describe("typography interface", () => {
  it("exposes only the approved semantic roles", () => {
    expect(Object.keys(typography)).toEqual([
      "display",
      "title",
      "heading",
      "body",
      "bodyStrong",
      "caption",
      "label",
      "eyebrow",
      "mono",
    ]);
  });

  it("uses one six-step size scale with no UI text below 12", () => {
    const sizes = [
      ...new Set(Object.values(typography).map((t) => t.fontSize)),
    ];

    expect(sizes.sort((a, b) => a - b)).toEqual([12, 14, 16, 18, 22, 32]);
  });

  it("loads only the five faces used by the public scale", () => {
    expect(Object.keys(fonts)).toEqual([
      "regular",
      "semibold",
      "bold",
      "black",
      "mono",
    ]);
  });
});

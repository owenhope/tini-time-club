import { fonts, typography } from "../tokens";

describe("typography interface", () => {
  it("exposes only the approved semantic roles", () => {
    expect(Object.keys(typography)).toEqual([
      "display",
      "wordmark",
      "title",
      "heading",
      "body",
      // TextInput text: body without a lineHeight, because iOS TextInputs
      // misalign typed text against the placeholder when one is set.
      "input",
      "bodyStrong",
      "caption",
      "label",
      "eyebrow",
      "mono",
    ]);
  });

  it("uses one seven-step size scale with no UI text below 12", () => {
    const sizes = [
      ...new Set(Object.values(typography).map((t) => t.fontSize)),
    ];

    expect(sizes.sort((a, b) => a - b)).toEqual([12, 14, 16, 18, 20, 22, 32]);
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

import { fonts, typography } from "../tokens";

describe("typography interface", () => {
  it("omits input line height to preserve iOS placeholder alignment", () => {
    expect(typography.input).not.toHaveProperty("lineHeight");
  });

  it("keeps UI text at least 12 points", () => {
    const sizes = [
      ...new Set(Object.values(typography).map((t) => t.fontSize)),
    ];

    expect(sizes.every((size) => Number.isFinite(size) && size >= 12)).toBe(
      true
    );
  });

  it("uses declared font families for every semantic role", () => {
    for (const role of Object.values(typography)) {
      expect(Object.values(fonts)).toContain(role.fontFamily);
    }
  });
});

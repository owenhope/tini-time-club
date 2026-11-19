import { fontFaces, fonts, typography } from "../tokens";

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

  it("uses a declared face for every semantic role", () => {
    const faces = Object.values(fontFaces);
    for (const role of Object.values(typography)) {
      const weight = "fontWeight" in role ? role.fontWeight : undefined;
      const isFigtreeFace = faces.some(
        (face) =>
          face.fontFamily === role.fontFamily && face.fontWeight === weight
      );
      const isStaticFont = (Object.values(fonts) as string[]).includes(
        role.fontFamily
      );
      expect(isFigtreeFace || isStaticFont).toBe(true);
    }
  });

  it("gives every Figtree role an explicit weight", () => {
    // Figtree is one variable family; without a weight it renders at 400.
    for (const role of Object.values(typography)) {
      if (role.fontFamily === "Figtree") {
        expect("fontWeight" in role && role.fontWeight).toBeTruthy();
      }
    }
  });
});

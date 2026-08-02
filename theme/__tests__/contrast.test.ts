import { lightColors, darkColors, type ThemeColors } from "../tokens";

/** Relative luminance per WCAG 2.1. */
const luminance = (hex: string): number => {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Composite a translucent `rgba(...)` token down onto its opaque background.
 * Borders and dividers are authored as alpha over a surface, and a ratio taken
 * against the raw token is meaningless — what the eye sees is the blend.
 */
const flatten = (color: string, backdrop: string): string => {
  const parts = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/
  );
  if (!parts) return color;
  const alpha = parts[4] === undefined ? 1 : parseFloat(parts[4]);
  const base = backdrop.replace("#", "");
  const channels = [0, 1, 2].map((i) => {
    const fg = parseInt(parts[i + 1], 10);
    const bg = parseInt(base.slice(i * 2, i * 2 + 2), 16);
    return Math.round(fg * alpha + bg * (1 - alpha));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(flatten(a, b)), luminance(b)].sort(
    (x, y) => y - x
  );
  return (hi + 0.05) / (lo + 0.05);
};

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

/**
 * Pairs that must stay legible. Anything rendered as text on a surface belongs
 * here — the point is that a future palette tweak fails the build rather than
 * silently shipping unreadable text.
 */
const bodyPairs = (c: ThemeColors): [string, string, string][] => [
  ["text on surface", c.text, c.surface],
  ["text on background", c.text, c.background],
  ["text on surfaceRaised", c.text, c.surfaceRaised],
  ["textSecondary on surface", c.textSecondary, c.surface],
  ["textSecondary on background", c.textSecondary, c.background],
  ["textMuted on surface", c.textMuted, c.surface],
  ["textMuted on background", c.textMuted, c.background],
  ["accent on surface", c.accent, c.surface],
  ["accent on background", c.accent, c.background],
  ["onAccent on accent", c.onAccent, c.accent],
  // `secondary` (chartreuse) is deliberately absent: it is a fill, never text
  // on a light surface. What has to be legible is the ink laid on top of it.
  ["onSecondary on secondary", c.onSecondary, c.secondary],
  ["danger on surface", c.danger, c.surface],
  ["tabBarActive on tabBar", c.tabBarActive, c.tabBar],
  ["tabBarInactive on tabBar", c.tabBarInactive, c.tabBar],
  ["onAccentTonal on accentTonal", c.onAccentTonal, c.accentTonal],
];

const largePairs = (c: ThemeColors): [string, string, string][] => [
  ["like on surface", c.like, c.surface],
  ["success on surface", c.success, c.surface],
  ["warning on surface", c.warning, c.surface],
  // The bar fill must be distinguishable from its track, since the bar is a
  // graphical object conveying the rating value.
  ["ratingFill on ratingTrack", c.ratingFill, c.ratingTrack],
  // A filled olive carries the rating, so it must be tellable from the surface
  // behind it. Its pimento does not — see the dedicated test below.
  ["olive body on surface", c.accent, c.surface],
];

/**
 * Borders and dividers are decorative separators, not the "visual information
 * required to identify a component" that WCAG 1.4.11 covers, so AA's 3:1 does
 * not apply. They still have to be perceptible, hence a lower floor.
 */
const VISIBLE = 1.25;
const decorativePairs = (c: ThemeColors): [string, string, string][] => [
  ["border on surface", c.border, c.surface],
  ["borderStrong on surface", c.borderStrong, c.surface],
  ["divider on background", c.divider, c.background],
  ["ratingPipEmpty on surface", c.ratingPipEmpty, c.surface],
];

describe.each([
  ["light", lightColors],
  ["dark", darkColors],
])("%s theme contrast", (name, colors) => {
  it.each(bodyPairs(colors))("%s meets AA for body text", (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it.each(largePairs(colors))(
    "%s meets AA for large text and UI",
    (_label, fg, bg) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  );

  it.each(decorativePairs(colors))("%s is perceptible", (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(VISIBLE);
  });

  /**
   * WCAG 1.4.3 exempts disabled controls from the contrast minimum, and the
   * palette leans on that — disabled text is meant to read as unavailable.
   * It still has to be visible enough to read the label, so it gets a floor of
   * its own rather than being dropped from the suite.
   */
  it("keeps disabled text readable without meeting AA", () => {
    expect(
      contrast(colors.disabledText, colors.disabledSurface)
    ).toBeGreaterThanOrEqual(2.5);
    expect(contrast(colors.disabledText, colors.disabledSurface)).toBeLessThan(
      AA_BODY
    );
  });

  /**
   * The pimento inside a filled olive is a hue accent, not information — the
   * rating is carried by how many olives are filled, so WCAG 1.4.11 does not
   * apply to the dot. Orange on green is barely a luminance contrast at all
   * (the design system's own pairing is 2.24:1), but the dot still has to be
   * *visible* or the olive stops looking like an olive, which is the whole
   * point of using it instead of a star.
   */
  it("keeps the pimento visible inside the olive", () => {
    expect(contrast(colors.ratingPipDot, colors.accent)).toBeGreaterThanOrEqual(
      2
    );
  });

  it("uses distinct surface steps so elevation is visible", () => {
    expect(colors.surface).not.toBe(colors.background);
    expect(colors.surfaceRaised).not.toBe(colors.surfaceSunken);
  });
});

describe("contrast helper", () => {
  it("computes the known extremes", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
});

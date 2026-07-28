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

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
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
  ["secondary on surface", c.secondary, c.surface],
  ["onSecondary on secondary", c.onSecondary, c.secondary],
  ["danger on surface", c.danger, c.surface],
  ["tabBarActive on tabBar", c.tabBarActive, c.tabBar],
  ["tabBarInactive on tabBar", c.tabBarInactive, c.tabBar],
  ["onAccentTonal on accentTonal", c.onAccentTonal, c.accentTonal],
  ["disabledText on disabledSurface", c.disabledText, c.disabledSurface],
];

const largePairs = (c: ThemeColors): [string, string, string][] => [
  ["like on surface", c.like, c.surface],
  ["success on surface", c.success, c.surface],
  ["warning on surface", c.warning, c.surface],
  // The bar fill must be distinguishable from its track, since the bar is a
  // graphical object conveying the rating value.
  ["ratingFill on ratingTrack", c.ratingFill, c.ratingTrack],
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

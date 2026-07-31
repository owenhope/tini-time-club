/**
 * Design tokens for Tini Time Club.
 *
 * Every colour pair used for text-on-surface below has been checked against
 * WCAG 2.1 AA (4.5:1 for body text, 3:1 for large text and UI boundaries).
 * The contrast ratio is noted where a pair was tuned to clear the bar — the
 * brand lavender in particular fails badly on white at its raw value
 * (#B6A3E2 on #FFFFFF is 2.06:1), so text and icon uses take a darkened
 * variant while the raw brand colour is kept for fills.
 */

// Brand anchors, kept as-is for fills and large decorative areas.
export const BRAND = {
  lavender: "#B6A3E2",
  olive: "#336654",
} as const;

const palette = {
  // Lavender ramp derived from the brand hue (~262°).
  lavender50: "#F5F1FC",
  lavender100: "#EDE7F6",
  lavender200: "#D9CCEF",
  lavender300: "#C4B2E8",
  lavender400: "#B6A3E2", // brand
  lavender500: "#9B84D1",
  lavender600: "#7B60BC", // 4.71:1 on white — safe for body text
  lavender700: "#614A96",
  lavender800: "#4A3873",

  // Olive ramp derived from the brand green (~160°).
  olive50: "#EEF5F2",
  olive100: "#D6E8E0",
  olive300: "#7FB3A0",
  olive400: "#4C8A73",
  olive500: "#336654", // brand — 6.31:1 on white
  olive600: "#2A5445",
  olive700: "#1F3E33",

  // Neutrals: warm-tinted so they sit with the lavender rather than fight it.
  white: "#FFFFFF",
  neutral25: "#FBFAFC",
  neutral50: "#F6F5F8",
  neutral100: "#EEEDF1",
  neutral200: "#E2E0E7",
  neutral300: "#C9C6D1",
  neutral400: "#A5A1B0",
  neutral500: "#6E6A7A", // 5.24:1 on white, 4.83:1 on background — lightest usable body grey
  neutral600: "#5C5867",
  neutral700: "#443F4E",
  neutral800: "#2A2732",
  neutral850: "#211E28",
  neutral900: "#17151D",
  neutral950: "#100E15",
  black: "#000000",

  // Status
  red400: "#F0656B",
  red500: "#D93B45",
  red600: "#B22B34",
  green500: "#2E9E6B",
  amber500: "#B87D14",
} as const;

export interface ThemeColors {
  // Surfaces, back to front
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  overlay: string;
  scrim: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  textOnImage: string;

  // Lines
  border: string;
  borderStrong: string;
  divider: string;

  // Brand / interactive
  accent: string;
  accentPressed: string;
  accentSubtle: string;
  onAccent: string;
  secondary: string;
  secondarySubtle: string;
  onSecondary: string;

  // Status
  danger: string;
  dangerSubtle: string;
  success: string;
  warning: string;

  // Tonal (low-emphasis filled) surfaces for secondary actions
  accentTonal: string;
  onAccentTonal: string;

  // Interaction states
  pressed: string;
  disabledSurface: string;
  disabledText: string;

  // Ratings
  ratingTrack: string;
  ratingFill: string;

  // Component-specific
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  imagePlaceholder: string;
  skeleton: string;
  like: string;
}

export const lightColors: ThemeColors = {
  background: palette.neutral50,
  surface: palette.white,
  surfaceRaised: palette.white,
  surfaceSunken: palette.neutral100,
  overlay: "rgba(0,0,0,0.55)",
  scrim: "rgba(0,0,0,0.35)",

  text: palette.neutral900, // 16.1:1 on surface
  textSecondary: palette.neutral600, // 7.3:1
  textMuted: palette.neutral500, // 5.24:1 on surface, 4.83:1 on background
  textOnAccent: palette.white,
  textOnImage: palette.white,

  border: palette.neutral200,
  borderStrong: palette.neutral300,
  divider: "#D8D5DE", // 1.33:1 on background, 1.45:1 on surface

  // Text/icon uses take lavender600; raw brand lavender is only a fill.
  accent: palette.lavender600,
  accentPressed: palette.lavender700,
  accentSubtle: palette.lavender50,
  onAccent: palette.white, // 4.71:1 on lavender600

  secondary: palette.olive500,
  secondarySubtle: palette.olive50,
  onSecondary: palette.white, // 6.31:1 on olive500

  danger: palette.red600,
  dangerSubtle: "#FDECEA",
  success: palette.green500,
  warning: palette.amber500,

  accentTonal: palette.lavender50,
  // lavender600 is 4.45:1 on the tonal fill, just under AA, so tonal labels
  // take the next step down the ramp.
  onAccentTonal: "#6E55A9", // 5.34:1 on accentTonal

  pressed: "rgba(23,21,29,0.08)",
  disabledSurface: palette.neutral100,
  disabledText: "#6B6777", // 4.70:1 on disabledSurface

  ratingTrack: palette.neutral200,
  ratingFill: palette.lavender600, // 3.78:1 on the track

  tabBar: palette.white,
  tabBarActive: palette.olive500,
  tabBarInactive: palette.neutral500,
  imagePlaceholder: palette.lavender100,
  skeleton: palette.neutral100,
  like: palette.red500,
};

export const darkColors: ThemeColors = {
  // Charcoal rather than pure black: less smearing on OLED scroll and it
  // lets elevation read through surface steps.
  background: palette.neutral950,
  surface: palette.neutral900,
  surfaceRaised: palette.neutral850,
  surfaceSunken: palette.black,
  overlay: "rgba(0,0,0,0.65)",
  scrim: "rgba(0,0,0,0.5)",

  text: "#F2F0F5", // 15.8:1 on surface
  textSecondary: "#B9B4C4", // 8.4:1
  textMuted: "#948EA0", // 5.71:1 on surface, 6.06:1 on background
  textOnAccent: palette.neutral950,
  textOnImage: palette.white,

  border: "#332F3C",
  borderStrong: "#453F52",
  divider: "#2A2732",

  // Lavender is lightened on dark; the light-mode accent (#7B60BC) would sit
  // at 2.3:1 against the dark surface.
  accent: palette.lavender300, // #C4B2E8 — 8.9:1 on surface
  accentPressed: palette.lavender200,
  accentSubtle: "#241F31",
  onAccent: palette.neutral950, // 9.2:1 on lavender300

  secondary: palette.olive300, // brand olive is 1.9:1 on dark, so lightened
  secondarySubtle: "#16241E",
  onSecondary: palette.neutral950,

  danger: palette.red400,
  dangerSubtle: "#2E1618",
  success: "#4FBF8B",
  warning: "#E0A94A",

  accentTonal: "#241F31",
  onAccentTonal: palette.lavender300, // 8.27:1 on accentTonal

  pressed: "rgba(255,255,255,0.10)",
  disabledSurface: palette.neutral800,
  disabledText: "#948EA0", // 4.63:1 on disabledSurface

  ratingTrack: "#332F3C",
  ratingFill: palette.lavender300, // 6.75:1 on the track

  tabBar: palette.neutral900,
  tabBarActive: palette.olive300,
  tabBarInactive: "#948EA0",
  imagePlaceholder: palette.neutral800,
  skeleton: palette.neutral800,
  like: palette.red400,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: 0,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: 0,
  },
  heading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: 0,
  },
  body: { fontSize: 15, lineHeight: 20, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0,
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    letterSpacing: 0,
  },
  // Large numerals in metric rows and rating summaries. Tabular figures keep
  // columns from shifting as values change.
  metric: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: 0,
  },
  metricLarge: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: 0,
  },
} as const;

/**
 * Elevation. Dark mode uses lighter surfaces rather than shadows, which are
 * close to invisible on a dark background.
 */
export const elevation = {
  light: {
    card: {
      shadowColor: "#1B1526",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    raised: {
      shadowColor: "#1B1526",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  dark: {
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 2,
    },
    raised: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 6,
    },
  },
} as const;

export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

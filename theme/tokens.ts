/**
 * Design tokens for Tini Time Club.
 *
 * Values are taken from the brand design system (`.claude/skills/
 * tini-time-club-design`): green #336654 is THE brand — logo, ink, primary
 * buttons, active states; purple #B6A3E2 is a background surface, not an
 * interactive accent; chartreuse #F2FF71 is the highlight / CTA that sings on
 * green; pimento #E8763D is the tiny-dose accent for ratings and hot flags.
 *
 * Every colour pair used for text-on-surface below has been checked against
 * WCAG 2.1 AA (4.5:1 for body text, 3:1 for large text and UI boundaries).
 * Raw brand colours are kept for fills; text/icon uses take a darkened variant
 * where the raw value fails the bar — the contrast ratio is noted where a pair
 * was tuned. The design system is light-first; the dark palette is rederived
 * from the brand greens so it still reads as Tini Time Club.
 */

// Brand anchors, kept as-is for fills and large decorative areas.
export const BRAND = {
  green: "#336654",
  purple: "#B6A3E2",
  chartreuse: "#F2FF71",
  pimento: "#E8763D",
} as const;

const palette = {
  // Green ramp — THE brand. #336654 is 6.31:1 on white.
  green900: "#1C3A2E",
  green800: "#27493B",
  green700: "#336654", // brand
  green600: "#2A5445",
  green500: "#4B8570",
  green300: "#8FB8A8",
  green100: "#DCE9E3",

  // Purple ramp — background surfaces. The raw brand purple fails on white
  // (#B6A3E2 is 2.06:1), so any text/icon use takes a darkened step.
  purple700: "#6B53A8", // 5.14:1 on white — safe for text
  purple600: "#8E76C9",
  purple500: "#B6A3E2", // brand — fills only
  purple300: "#D3C7EE",
  purple100: "#EDE7F8",

  // Chartreuse — highlight / CTA on green. Fill only; it fails as text on any
  // light surface. Pairs with green-700 ink (5.9:1 on chartreuse-500).
  chartreuse600: "#D6E640",
  chartreuse500: "#F2FF71",
  chartreuse300: "#F7FFA8",

  // Pimento — the olive's pimento. Ratings, hot/trending flags, unread dots.
  // The raw brand value is 2.96:1 on white, just under the 3:1 bar for large
  // text and graphical objects, so text and meter fills take the darkened
  // step; pimento-500 stays for decorative fills where nothing is read off it.
  pimento600: "#CC6836", // 3.75:1 on white, 3.0:1 on the paper-200 rating track
  pimento500: "#E8763D",
  pimentoPink500: "#EA6360",

  // Neutrals: warm paper greys from the brand sheets.
  white: "#FFFFFF",
  paper050: "#FAF9F6",
  paper100: "#F2F1EE",
  paper200: "#E5E6E8", // the grey from the logo sheets
  paper300: "#CFD1D4",
  ink500: "#6E7472",
  ink700: "#3F4B46",
  ink900: "#141A17", // near-black for photo scrims — never pure #000

  // Status
  red400: "#EA6360",
  red500: "#D64A46",
  red600: "#C6443F",
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
  /**
   * For chips and controls that sit *on* a photo and carry their own text or
   * icon. `scrim` only dims — at 0.35 white text over a bright photo lands at
   * 2.1:1 — so anything readable needs this heavier plate instead.
   */
  scrimStrong: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  textOnImage: string;
  // Interactive tint for controls sitting on a photo scrim, where `accent`
  // is too dark to read in either scheme. Same value in both themes — the
  // scrim is dark regardless.
  accentOnImage: string;

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

  // Chartreuse highlight (CTA on green / loud accent)
  highlight: string;
  highlightSubtle: string;
  onHighlight: string;

  // Brand surfaces (full-bleed colour blocks)
  surfaceBrand: string; // purple — the primary brand background
  surfaceInk: string; // green-700 — "club / insider" ground
  surfaceInkDeep: string; // green-900
  onInk: string; // text on green surfaces

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
  background: palette.paper050,
  surface: palette.white,
  surfaceRaised: palette.white,
  surfaceSunken: palette.paper100,
  // Scrims are the brand near-black green, never pure #000.
  overlay: "rgba(20,26,23,0.55)",
  scrim: "rgba(20,26,23,0.35)",
  scrimStrong: "rgba(20,26,23,0.65)", // 5.2:1 for white text over a white photo

  text: palette.green900, // #1C3A2E — 13.0:1 on surface
  textSecondary: palette.ink700, // #3F4B46 — 8.6:1
  textMuted: palette.ink500, // #6E7472 — 4.6:1 on surface
  textOnAccent: palette.paper050,
  textOnImage: palette.paper050,
  accentOnImage: palette.green300, // 7.4:1 on the ink-900 scrim

  border: "rgba(51,102,84,0.18)", // brand hairline
  borderStrong: palette.green700,
  divider: "rgba(51,102,84,0.16)",

  // Green is the brand — primary interactive colour.
  accent: palette.green700, // #336654 — 6.31:1 on white
  accentPressed: palette.green800,
  accentSubtle: palette.green100,
  onAccent: palette.paper050, // 6.0:1 on green-700

  // Secondary interactive == the chartreuse highlight (CTA on green).
  secondary: palette.chartreuse500,
  secondarySubtle: palette.chartreuse300,
  onSecondary: palette.green700, // 5.9:1 on chartreuse-500

  highlight: palette.chartreuse500,
  highlightSubtle: palette.chartreuse300,
  onHighlight: palette.green700,

  surfaceBrand: palette.purple500,
  surfaceInk: palette.green700,
  surfaceInkDeep: palette.green900,
  onInk: palette.paper050,

  danger: palette.red600,
  dangerSubtle: "#FBEAE9",
  success: palette.green500,
  warning: palette.pimento600,

  accentTonal: palette.green100,
  onAccentTonal: palette.green800, // 8.1:1 on green-100

  pressed: "rgba(20,26,23,0.07)",
  disabledSurface: palette.paper100,
  disabledText: "#8A908D", // ~3.0:1 on disabledSurface (disabled is exempt)

  ratingTrack: palette.paper200,
  ratingFill: palette.pimento600, // the pimento — ratings accent

  tabBar: palette.white,
  tabBarActive: palette.green700,
  tabBarInactive: palette.ink500,
  imagePlaceholder: palette.purple100,
  skeleton: palette.paper100,
  like: palette.pimentoPink500,
};

export const darkColors: ThemeColors = {
  // Deep-green charcoal rather than pure black — keeps the brand hue in the
  // dark and lets elevation read through the surface steps.
  background: "#0E1712",
  surface: "#16241D",
  surfaceRaised: "#1E3229",
  surfaceSunken: "#0A120E",
  overlay: "rgba(6,10,8,0.66)",
  scrim: "rgba(6,10,8,0.5)",
  scrimStrong: "rgba(6,10,8,0.66)",

  text: "#EEF3F0", // 14.8:1 on surface
  textSecondary: palette.green300, // #8FB8A8 — 7.4:1
  textMuted: "#7F978C", // 4.9:1 on surface
  textOnAccent: "#0E1712",
  textOnImage: palette.paper050,
  accentOnImage: palette.green300, // 7.4:1 on the ink-900 scrim

  border: "rgba(143,184,168,0.16)",
  borderStrong: palette.green300,
  divider: "rgba(143,184,168,0.13)",

  // Primary interactive stays green, lightened for the dark ground.
  accent: palette.green300, // #8FB8A8 — 7.4:1 on surface
  accentPressed: "#A9CCBF",
  accentSubtle: "#1E3229",
  onAccent: "#0E1712", // 7.4:1 under green-300

  // Chartreuse is the loud secondary — it sings on dark green.
  secondary: palette.chartreuse500,
  secondarySubtle: "#2C3A1A",
  onSecondary: palette.green900,

  highlight: palette.chartreuse500,
  highlightSubtle: "#2C3A1A",
  onHighlight: palette.green900,

  surfaceBrand: palette.purple700,
  surfaceInk: palette.green800,
  surfaceInkDeep: "#0E1712",
  onInk: palette.paper050,

  danger: palette.red400,
  dangerSubtle: "#2E1615",
  success: "#5CB58F",
  warning: "#EF8A54",

  accentTonal: "#1E3229",
  onAccentTonal: palette.green300, // 6.9:1 on the tonal fill

  pressed: "rgba(255,255,255,0.09)",
  disabledSurface: "#1E3229",
  disabledText: "#6E857B",

  ratingTrack: "#2A3B33",
  ratingFill: "#EF8A54", // pimento, lifted for dark

  tabBar: "#16241D",
  tabBarActive: palette.green300,
  tabBarInactive: "#7F978C",
  imagePlaceholder: "#2A3B33",
  skeleton: "#1E3229",
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
  // Brand-semantic radii — controls are pill, surfaces are soft-square.
  input: 10,
  thumb: 16, // thumbnails
  card: 22,
  sheet: 28, // sheets / modals
} as const;

/**
 * Font families. Figtree (variable 300–900) stands in for the wordmark's
 * heavy geometric grotesque; DM Mono for measurements, ABV, prices, coords.
 * On React Native the weight lives in the family name, so styles set
 * `fontFamily` rather than `fontWeight`.
 */
export const fonts = {
  light: "Figtree_300Light",
  regular: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
  extrabold: "Figtree_800ExtraBold",
  black: "Figtree_900Black",
  mono: "DMMono_400Regular",
  monoMedium: "DMMono_500Medium",
} as const;

export const typography = {
  // Display — the wordmark's stacked, tight-set energy. Lowercase, heavy,
  // leading below 1, negative tracking.
  display: {
    fontFamily: fonts.black,
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -1,
    textTransform: "lowercase",
  },
  displayLarge: {
    fontFamily: fonts.black,
    fontSize: 44,
    lineHeight: 42,
    letterSpacing: -1.4,
    textTransform: "lowercase",
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 23,
  },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  // Eyebrow — tiny uppercase tracked utility type.
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  micro: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
  },
  // Large numerals in metric rows and rating summaries.
  metric: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
  },
  metricLarge: {
    fontFamily: fonts.black,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  // Mono — measurements, ABV, prices, coordinates, timestamps.
  mono: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
} as const;

/**
 * Elevation. Shadows are green-tinted, low and two-layered in spirit; RN takes
 * a single shadow, so we use the brand green as the shadow colour. Dark mode
 * leans on lighter surfaces rather than shadows.
 */
export const elevation = {
  light: {
    card: {
      shadowColor: "#1C3A2E",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    raised: {
      shadowColor: "#1C3A2E",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
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
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
  },
} as const;

export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

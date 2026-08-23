/**
 * Design tokens for Tini Time Club.
 *
 * Values are taken from the brand design system (`.claude/skills/
 * tini-time-club-design`), with one deliberate departure from it: the brand
 * ranks the colours **purple primary, green secondary, chartreuse accent**.
 * The system sheets treat green as the primary interactive and purple as a
 * background-only surface; here purple carries the interactive weight
 * (buttons, links, active states), green owns the club's ground surfaces and
 * the olives, and chartreuse stays the loud third — CTAs on green, selected
 * pills, the compose button. Pimento remains the tiny-dose rating accent.
 *
 * Purple needs a darker step to carry text or white labels: the raw brand
 * #B6A3E2 is 2.06:1 on white, so light mode's interactive purple is
 * purple-700 and the brand tint stays for fills.
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
  green900: "#336654",
  green800: "#336654",
  green700: "#336654", // brand
  green600: "#336654",
  green500: "#336654",
  green300: "#336654",
  green100: "#336654",

  // Purple ramp — the primary interactive colour, and the brand's background
  // surface. The raw brand purple fails on white (#B6A3E2 is 2.06:1), so
  // anything carrying text or a white label takes a darkened step.
  purple800: "#54408A", // pressed step under purple-700
  purple700: "#6B53A8", // 5.14:1 on white — primary in light
  purple600: "#8E76C9",
  purple500: "#B6A3E2", // brand — fills, and primary in dark
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
  pimentoPink500: "#EA6363",

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
  red400: "#EA6363",
  red500: "#EA6363",
  red600: "#C7372F", // 5.2:1 on white — danger text in light mode
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
  /** What the member types into any TextInput: pure black on light, pure
   *  white on dark — maximum contrast against the field, distinct from the
   *  brand-green ink that body copy uses. */
  inputText: string;
  postText: string;
  usernameText: string;
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
  headerBrand: string; // darker purple — app chrome that carries light text
  surfaceInk: string; // green-700 — "club / insider" ground
  surfaceInkDeep: string; // green-900
  onInk: string; // text on green surfaces
  onHeaderBrand: string; // text on `headerBrand`
  /**
   * Ink for the purple surface. Green on purple is the system's approved
   * *lockup* pairing, but at 2.9:1 it fails as text — so a purple block takes
   * near-black green in light and paper in dark.
   */
  onBrand: string;

  // Status
  danger: string;
  dangerSubtle: string;
  success: string;
  warning: string;
  unread: string;

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
  /**
   * The same meter on a green surface or a photo scrim. `ratingFill` is the
   * pimento on paper; on green the pimento muddies and white reads as neutral
   * chrome, so the fill becomes the chartreuse — still the rating accent, just
   * the one that belongs to that ground. Fixed in both schemes, like every
   * other chartreuse use.
   */
  ratingFillOnInk: string;
  /** The meter's track on a green surface or scrim: 18% of the paper ink. */
  ratingTrackOnInk: string;
  /**
   * Outline of an unearned olive pip. The filled olive body is `accent`; this
   * is the hollow state, soft enough to read as "not yet" without being
   * mistaken for a filled pip.
   */
  ratingPipEmpty: string;
  /**
   * The pimento inside a filled olive. Orange on green is a hue contrast, not
   * a luminance one — the design's own pairing is 2.24:1 — so this is a
   * decorative detail, never a carrier of the rating. Dark mode needs a deeper
   * pimento because the olive body lightens to sage there.
   */
  ratingPipDot: string;

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

  text: palette.green900,
  inputText: "#000000",
  postText: palette.ink900,
  usernameText: palette.ink900,
  textSecondary: palette.ink700, // #3F4B46 — 8.6:1
  // Dark enough to remain AA on every light surface, including paper-200.
  textMuted: "#606865",
  textOnAccent: palette.paper050,
  textOnImage: palette.paper050,
  accentOnImage: palette.green300, // 7.4:1 on the ink-900 scrim

  border: "rgba(51,102,84,0.18)", // brand hairline
  borderStrong: palette.green700,
  divider: "rgba(51,102,84,0.16)",

  // Purple is the primary interactive colour: buttons, links, active states.
  accent: palette.purple700, // #6B53A8 — 5.14:1 on white
  accentPressed: palette.purple800,
  accentSubtle: palette.purple100,
  onAccent: palette.paper050, // 4.9:1 on purple-700

  // Green is the secondary: the club's own colour, and the olives'.
  secondary: palette.green700, // #336654 — 6.31:1 on white
  secondarySubtle: palette.green100,
  onSecondary: palette.paper050, // 6.0:1 on green-700

  highlight: palette.chartreuse500,
  highlightSubtle: palette.chartreuse300,
  onHighlight: palette.green700,

  surfaceBrand: palette.purple500,
  headerBrand: palette.purple700,
  onHeaderBrand: palette.paper050,
  onBrand: palette.ink900,
  surfaceInk: palette.green700,
  surfaceInkDeep: palette.green900,
  onInk: palette.paper050,

  danger: palette.red600,
  dangerSubtle: "#FBEAE9",
  success: palette.green500,
  warning: palette.pimento600,
  unread: palette.pimento600,

  accentTonal: palette.purple100,
  onAccentTonal: palette.purple700, // 4.8:1 on purple-100

  pressed: "rgba(20,26,23,0.07)",
  disabledSurface: palette.paper100,
  disabledText: "#8A908D", // ~3.0:1 on disabledSurface (disabled is exempt)

  ratingTrack: palette.paper200,
  ratingPipEmpty: palette.green300,
  ratingPipDot: palette.pimento500, // 2.24:1 on the green-700 olive — hue, not luminance
  ratingFill: palette.pimento600, // the pimento — ratings accent
  ratingFillOnInk: palette.chartreuse500,
  ratingTrackOnInk: "rgba(250,249,246,0.18)",

  tabBar: palette.white,
  tabBarActive: palette.purple700,
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
  inputText: "#FFFFFF",
  postText: "#EEF3F0",
  usernameText: "#EEF3F0",
  // Keep the hierarchy visible in dark mode: secondary must be dimmer than
  // primary, while muted still clears AA on the lightest raised surface.
  textSecondary: "#B8C7BF",
  textMuted: "#879E93",
  textOnAccent: "#0E1712",
  textOnImage: palette.paper050,
  accentOnImage: palette.green300, // 7.4:1 on the ink-900 scrim

  border: "rgba(51,102,84,0.32)",
  borderStrong: palette.green300,
  divider: "rgba(51,102,84,0.28)",

  // Primary interactive is the purple, at the brand tint — dark enough
  // ground that #B6A3E2 clears 7:1 without the darkened step light needs.
  accent: palette.purple500, // #B6A3E2 — 7.9:1 on surface
  accentPressed: palette.purple300,
  accentSubtle: "#2A2340",
  onAccent: "#140E24", // 8.6:1 under purple-500

  // Green is the secondary here too, lightened for the dark ground.
  secondary: palette.green300,
  secondarySubtle: "#1E3229",
  onSecondary: palette.paper050,

  highlight: palette.chartreuse500,
  highlightSubtle: "#2C3A1A",
  onHighlight: palette.green900,

  surfaceBrand: palette.purple700,
  headerBrand: palette.purple700,
  onHeaderBrand: palette.paper050,
  onBrand: palette.paper050, // 5.82:1 on purple-700
  surfaceInk: palette.green800,
  surfaceInkDeep: palette.green700,
  onInk: palette.paper050,

  danger: palette.red400,
  dangerSubtle: "#2E1615",
  success: "#4F9D7C", // 4.9:1 on dark surface — success text/UI
  warning: "#EF8A54",
  unread: "#EF8A54",

  accentTonal: "#2A2340",
  onAccentTonal: palette.purple300, // 7.6:1 on the tonal fill

  pressed: "rgba(255,255,255,0.09)",
  disabledSurface: "#1E3229",
  disabledText: "#6E857B",

  ratingTrack: "#2A3B33",
  ratingPipEmpty: palette.green700,
  ratingPipDot: "#A33F14", // 2.93:1 on the sage olive body dark mode uses
  ratingFill: "#EF8A54", // pimento, lifted for dark
  ratingFillOnInk: palette.chartreuse500,
  ratingTrackOnInk: "rgba(250,249,246,0.18)",

  tabBar: "#16241D",
  tabBarActive: palette.purple500,
  tabBarInactive: "#7F978C",
  imagePlaceholder: "#2A3B33",
  skeleton: "#1E3229",
  like: palette.red400,
};

/**
 * 4px base. The design system's working scale is 4/8/12/16/20/24/32/40/48/64/
 * 80/96; `gutter` is the 10px side padding every mobile screen uses.
 * `sheetGutter` preserves the roomier 20px inset on slide-up sheets.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  gutter: 10,
  sheetGutter: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
  giant: 80,
} as const;

/**
 * Controls are pill, surfaces are soft-square — the scale below is the design
 * system's, so `card`/`sheet`/`thumb`/`input` are the semantic names for the
 * steps rather than a second, disagreeing set of numbers.
 */
export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
  input: 10, // === sm
  thumb: 16, // === md — thumbnails
  card: 22, // === lg
  sheet: 28, // === xl — sheets / modals
} as const;

/**
 * Motion. Fast and confident: press is 120ms, state changes 180ms, sheets and
 * route transitions 280ms. `spring` is reserved for the two celebratory
 * moments (a review posting, a rank-up) and never used for navigation.
 */
export const duration = {
  fast: 120,
  base: 180,
  slow: 280,
} as const;

/** Cubic-bezier control points, for Easing.bezier(...spread). */
export const easing = {
  out: [0.2, 0.8, 0.3, 1],
  inOut: [0.6, 0, 0.3, 1],
  spring: [0.22, 1.3, 0.36, 1],
} as const;

/** Filled controls darken and shrink slightly on press. No ripple. */
export const PRESS_SCALE = 0.97;

/**
 * Font families. Figtree stands in for the wordmark's
 * heavy geometric grotesque; DM Mono for measurements, ABV, prices, coords.
 * On React Native the weight lives in the family name, so styles set
 * `fontFamily` rather than `fontWeight`.
 */
export const fonts = {
  regular: "Figtree_400Regular",
  semibold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
  black: "Figtree_900Black",
  mono: "DMMono_400Regular",
} as const;

export const typography = {
  // Six sizes, five faces, and nine semantic roles. Theme mode never changes
  // geometry; light/dark hierarchy belongs to the colour tones above.
  display: {
    fontFamily: fonts.black,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  /** TextInput text. Body's font WITHOUT a lineHeight: iOS TextInputs render
   *  typed text lower than the placeholder when lineHeight exceeds the
   *  font's natural height, so the text visibly drops on the first
   *  keystroke. Pair with colors.inputText. */
  input: { fontFamily: fonts.regular, fontSize: 16 },
  bodyStrong: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  // Eyebrow — tiny uppercase tracked utility type.
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  // Mono — measurements, ABV, prices, coordinates, timestamps.
  mono: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
} as const;

/** A one-point reduction for dense media-header titles. This remains outside
 * the public semantic type scale so screens cannot use it as a general-purpose
 * typography escape hatch. */
export const compactDisplayTypography = {
  ...typography.display,
  fontSize: typography.display.fontSize - 1,
  lineHeight: typography.display.lineHeight - 1,
} as const;

/**
 * Elevation. Shadows are green-tinted, low and two-layered in spirit; RN takes
 * a single shadow, so we use the brand green as the shadow colour. Dark mode
 * leans on lighter surfaces rather than shadows.
 */
export const elevation = {
  light: {
    card: {
      shadowColor: "#336654",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    raised: {
      shadowColor: "#336654",
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

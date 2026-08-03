/**
 * Tini Time Club — design-system tokens, ported to React Native.
 *
 * Drop-in replacement for `theme/tokens.ts`. Same exported shape
 * (BRAND, lightColors, darkColors, spacing, radius, typography, elevation,
 * HIT_SLOP, ThemeColors) so `theme/ThemeProvider.tsx` needs no changes.
 *
 * Source of truth: tokens/colors.css, typography.css, spacing.css, effects.css.
 * Contrast ratios noted where a pair was tuned to clear WCAG AA.
 */

// The four brand colours. There is no fifth.
export const BRAND = {
  green: "#336654", // the logo colour — ink, primary fill
  purple: "#B6A3E2", // primary brand background
  chartreuse: "#F2FF71", // highlight / CTA on green
  pimento: "#E8763D", // tiny-dose accent: ratings, hot flags
  /** @deprecated alias kept so existing `BRAND.lavender` / `BRAND.olive` compile */
  lavender: "#B6A3E2",
  olive: "#336654",
} as const;

const palette = {
  green900: "#1C3A2E",
  green800: "#27493B",
  green700: "#336654", // 6.31:1 on white
  green500: "#4B8570",
  green300: "#8FB8A8",
  green100: "#DCE9E3",

  purple700: "#6B53A8", // 5.9:1 on white — the only purple safe for text
  purple600: "#8E76C9",
  purple500: "#B6A3E2", // brand — fills only, 2.06:1 on white
  purple300: "#D3C7EE",
  purple100: "#EDE7F8",

  chartreuse600: "#D6E640",
  chartreuse500: "#F2FF71", // 11.4:1 on green700
  chartreuse300: "#F7FFA8",

  pimento500: "#E8763D",
  pimentoPink500: "#EA6360",

  paper000: "#FFFFFF",
  paper050: "#FAF9F6",
  paper100: "#F2F1EE",
  paper200: "#E5E6E8", // the grey from the logo sheets
  paper300: "#CFD1D4",
  ink500: "#6E7472", // 4.68:1 on paper050
  ink900: "#141A17", // near-black for scrims — never pure #000
  black: "#000000",

  danger500: "#C6443F",
  danger300: "#E88A86",
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  /** Full-bleed brand ground: purple in light, deep green in dark. */
  surfaceBrand: string;
  onSurfaceBrand: string;
  /** Deep-green "club/insider" ground. */
  surfaceInk: string;
  onSurfaceInk: string;
  /** Chartreuse — one loud block per screen, max. */
  surfaceHighlight: string;
  onSurfaceHighlight: string;
  overlay: string;
  scrim: string;
  glass: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  textOnImage: string;

  border: string;
  borderStrong: string;
  divider: string;

  accent: string;
  accentPressed: string;
  accentSubtle: string;
  onAccent: string;
  secondary: string;
  secondarySubtle: string;
  onSecondary: string;

  danger: string;
  dangerSubtle: string;
  success: string;
  warning: string;

  accentTonal: string;
  onAccentTonal: string;

  pressed: string;
  focusRing: string;
  disabledSurface: string;
  disabledText: string;

  ratingTrack: string;
  ratingFill: string;

  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  imagePlaceholder: string;
  skeleton: string;
  like: string;
}

export const lightColors: ThemeColors = {
  background: palette.paper050,
  surface: palette.paper000,
  surfaceRaised: palette.paper000,
  surfaceSunken: palette.paper100,
  surfaceBrand: palette.purple500,
  onSurfaceBrand: palette.green700, // 5.4:1 — the approved green-on-purple pair
  surfaceInk: palette.green700,
  onSurfaceInk: palette.paper050,
  surfaceHighlight: palette.chartreuse500,
  onSurfaceHighlight: palette.green700, // 7.1:1
  overlay: "rgba(20,26,23,0.55)",
  scrim: "rgba(28,58,46,0.55)",
  glass: "rgba(250,249,246,0.72)",

  text: palette.ink900, // 16.4:1 on surface
  textSecondary: palette.green700, // headings + supporting copy take brand ink
  textMuted: palette.ink500, // 4.79:1 on surface
  textOnAccent: palette.paper050,
  textOnImage: palette.paper050,

  border: "rgba(51,102,84,0.14)", // the hairline
  borderStrong: palette.green700,
  divider: "rgba(51,102,84,0.10)",

  // Green is the primary. Purple stays a background, never a button fill.
  accent: palette.green700,
  accentPressed: palette.green800,
  accentSubtle: palette.green100,
  onAccent: palette.paper050, // 6.0:1

  // Chartreuse is the loud CTA — legible only on green/ink, hence dark label.
  secondary: palette.chartreuse500,
  secondarySubtle: palette.chartreuse300,
  onSecondary: palette.green700, // 7.1:1

  danger: palette.danger500,
  dangerSubtle: "#FBEBEA",
  success: palette.green500,
  warning: palette.pimento500,

  accentTonal: palette.green100,
  onAccentTonal: "#27493B", // 8.0:1 on green100

  pressed: "rgba(28,58,46,0.10)",
  focusRing: palette.chartreuse500,
  disabledSurface: palette.paper200,
  disabledText: "#65706B", // 4.6:1 on disabledSurface

  ratingTrack: palette.paper200,
  ratingFill: palette.pimento500, // the pimento — ratings are the brand's own dot
  tabBar: "rgba(250,249,246,0.72)", // glass; blur it with BlurView
  tabBarActive: palette.green700,
  tabBarInactive: palette.ink500,
  imagePlaceholder: palette.paper100,
  skeleton: palette.paper100,
  like: palette.pimentoPink500,
};

/**
 * Dark mode is an extension — the brand sheets define no dark theme.
 * It reads as the "club after dark" register: deep-green ink grounds,
 * chartreuse as the interactive colour (green is unreadable on green).
 */
export const darkColors: ThemeColors = {
  background: "#0E1310",
  surface: palette.ink900,
  surfaceRaised: palette.green900,
  surfaceSunken: "#090C0A",
  surfaceBrand: palette.green900,
  onSurfaceBrand: palette.chartreuse500,
  surfaceInk: palette.green900,
  onSurfaceInk: palette.paper050,
  surfaceHighlight: palette.chartreuse500,
  onSurfaceHighlight: palette.green900,
  overlay: "rgba(9,12,10,0.72)",
  scrim: "rgba(9,12,10,0.6)",
  glass: "rgba(20,26,23,0.72)",

  text: palette.paper050, // 15.9:1 on surface
  textSecondary: "#C3D2CB", // 9.8:1
  textMuted: palette.green300, // 6.9:1 on surface

  textOnAccent: palette.green900,
  textOnImage: palette.paper050,

  border: "rgba(242,255,113,0.16)",
  borderStrong: "rgba(242,255,113,0.42)",
  divider: "rgba(242,255,113,0.10)",

  accent: palette.chartreuse500, // 13.7:1 on surface
  accentPressed: palette.chartreuse600,
  accentSubtle: "#1C2A22",
  onAccent: palette.green900,

  secondary: palette.green300,
  secondarySubtle: "#1A2A23",
  onSecondary: palette.green900,

  danger: palette.danger300,
  dangerSubtle: "#2B1615",
  success: "#6FC7A6",
  warning: "#F0975F",

  accentTonal: "#1F2E26",
  onAccentTonal: palette.chartreuse300, // 12.1:1

  pressed: "rgba(242,255,113,0.12)",
  focusRing: palette.chartreuse500,
  disabledSurface: palette.green800,
  disabledText: "#8A9A92", // 4.6:1 on disabledSurface

  ratingTrack: "#2A3A32",
  ratingFill: "#F0894F", // pimento lifted for dark grounds
  tabBar: "rgba(20,26,23,0.72)",
  tabBarActive: palette.chartreuse500,
  tabBarInactive: palette.green300,
  imagePlaceholder: palette.green900,
  skeleton: palette.green900,
  like: palette.pimentoPink500,
};

// 4px base. The DS scale is 4/8/12/16/20/24/32/40/48/64/80/96.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  gutter: 20, // mobile side gutter — fixed by the DS
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

// Controls are pill; surfaces are soft-square.
export const radius = {
  xs: 6,
  sm: 10, // rectangular inputs
  md: 16, // thumbnails
  lg: 22, // cards
  xl: 28, // sheets, modals
  pill: 999,
  card: 22,
  sheet: 28,
} as const;

/**
 * Font families assume `@expo-google-fonts/figtree` + `@expo-google-fonts/dm-mono`.
 * Swap these three constants when the licensed wordmark family arrives.
 */
export const fontFamily = {
  black: "Figtree_900Black",
  extraBold: "Figtree_800ExtraBold",
  bold: "Figtree_700Bold",
  semibold: "Figtree_600SemiBold",
  medium: "Figtree_500Medium",
  regular: "Figtree_400Regular",
  mono: "DMMono_400Regular",
} as const;

/**
 * Display is lowercase, black-weight, sub-1 leading, negative tracking — the
 * wordmark's own voice. Lowercase the *string*, don't use textTransform, so
 * screen readers still get real words.
 */
export const typography = {
  display: {
    fontFamily: fontFamily.black,
    fontSize: 40,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  displaySmall: {
    fontFamily: fontFamily.black,
    fontSize: 28,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: -0.84,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.36,
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.28,
  },
  subheading: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
    letterSpacing: -0.24,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "400",
  },
  bodyStrong: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "600",
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.2, // uppercase utility type
  },
  eyebrow: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1.76,
  },
  micro: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
  // Measurements, ABV, prices, coordinates, journal timestamps.
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    letterSpacing: 0.13,
  },
  metric: {
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: -0.33,
  },
  metricLarge: {
    fontFamily: fontFamily.black,
    fontSize: 40,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
} as const;

/** Shadows are green-tinted, low, two-layered. RN takes one layer — the wide soft one. */
export const elevation = {
  light: {
    card: {
      shadowColor: "#1C3A2E",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 2,
    },
    raised: {
      shadowColor: "#1C3A2E",
      shadowOffset: { width: 0, height: 11 },
      shadowOpacity: 0.16,
      shadowRadius: 22,
      elevation: 6,
    },
    overlay: {
      shadowColor: "#141A17",
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.34,
      shadowRadius: 35,
      elevation: 16,
    },
  },
  dark: {
    // Dark mode steps surfaces instead of casting shadows.
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 2,
    },
    raised: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 6,
    },
    overlay: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.6,
      shadowRadius: 30,
      elevation: 16,
    },
  },
} as const;

/** 120ms press, 180ms state, 280ms sheets/routes. Spring is celebratory only. */
export const motion = {
  fast: 120,
  base: 180,
  slow: 280,
  pressScale: 0.97,
  spring: { damping: 14, stiffness: 260, mass: 0.9 },
} as const;

export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

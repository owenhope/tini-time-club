import React from "react";
import { Text, type TextProps } from "react-native";
import { typography, useTheme } from "@/theme";

export type TypographyVariant = keyof typeof typography;
export type TextTone =
  | "default"
  | "secondary"
  | "muted"
  | "accent"
  | "danger"
  | "onAccent"
  | "onImage"
  | "onInk"
  | "onBrand"
  | "onHighlight";

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
}

// Display type is lowercase — the wordmark's own voice. Lowercasing the string
// (rather than textTransform) keeps screen readers reading real words.
const LOWERCASE_VARIANTS: ReadonlySet<TypographyVariant> = new Set([
  "display",
  "displaySmall",
]);
// Utility type is uppercase and tracked.
const UPPERCASE_VARIANTS: ReadonlySet<TypographyVariant> = new Set([
  "eyebrow",
  "label",
]);

const castCase = (node: React.ReactNode, variant: TypographyVariant): React.ReactNode => {
  if (typeof node === "string") {
    if (LOWERCASE_VARIANTS.has(variant)) return node.toLowerCase();
    if (UPPERCASE_VARIANTS.has(variant)) return node.toUpperCase();
  }
  if (Array.isArray(node)) return node.map((n) => castCase(n, variant));
  return node;
};

/**
 * Semantic text primitive. Screens choose a role; the theme owns size, weight,
 * family, tracking and case so the app keeps one predictable hierarchy.
 */
const AppText: React.FC<AppTextProps> = ({
  variant = "body",
  tone = "default",
  style,
  children,
  ...props
}) => {
  const { colors, typography: type } = useTheme();
  const toneColors = {
    default: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    accent: colors.accent,
    danger: colors.danger,
    onAccent: colors.onAccent,
    onImage: colors.textOnImage,
    onInk: colors.onSurfaceInk,
    onBrand: colors.onSurfaceBrand,
    onHighlight: colors.onSurfaceHighlight,
  } as const;

  return (
    <Text style={[type[variant], { color: toneColors[tone] }, style]} {...props}>
      {castCase(children, variant)}
    </Text>
  );
};

export default AppText;

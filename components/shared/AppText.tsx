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
  /** Supporting type on a green ground or a photo scrim. */
  | "accentOnImage";

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
}

/**
 * Semantic text primitive. Screens choose a role; the theme owns its size,
 * weight and line height so the app keeps one predictable hierarchy.
 */
const AppText: React.FC<AppTextProps> = ({
  variant = "body",
  tone = "default",
  style,
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
    accentOnImage: colors.accentOnImage,
  } as const;

  return (
    <Text
      style={[type[variant], { color: toneColors[tone] }, style]}
      {...props}
    />
  );
};

export default AppText;

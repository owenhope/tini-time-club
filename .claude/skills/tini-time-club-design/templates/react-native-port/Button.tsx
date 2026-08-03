import React from "react";
import {
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme, motion } from "@/theme";
import AppText, { type TypographyVariant } from "./AppText";

export type ButtonSize = "small" | "medium" | "large" | "xlarge";
export type ButtonVariant =
  | "primary" // green fill — the default action on paper
  | "highlight" // chartreuse fill — the loud CTA, only on green/ink grounds
  | "tonal" // green-100 wash
  | "secondary" // alias of highlight, kept for source compatibility
  | "outline"
  | "ghost"
  | "danger";
export type ButtonIconPosition = "left" | "right" | "none";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: ButtonIconPosition;
  iconColor?: string;
  iconSize?: number;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  size = "medium",
  variant = "primary",
  icon,
  iconPosition = "none",
  iconColor,
  iconSize,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const scale = React.useRef(new Animated.Value(1)).current;

  const springTo = (value: number) =>
    Animated.timing(scale, {
      toValue: value,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();

  // 44pt minimum touch target everywhere; "small" is visual weight, not hit area.
  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    small: { paddingVertical: 10, paddingHorizontal: 18, minHeight: 44 },
    medium: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 48 },
    large: { paddingVertical: 16, paddingHorizontal: 24, minHeight: 56 },
    xlarge: { paddingVertical: 20, paddingHorizontal: 32, minHeight: 64 },
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case "highlight":
      case "secondary":
        return { backgroundColor: colors.secondary, borderWidth: 0 };
      case "tonal":
        return { backgroundColor: colors.accentTonal, borderWidth: 0 };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 2, // 2px solid green is the DS's selection/outline weight
          borderColor: colors.accent,
        };
      case "ghost":
        return { backgroundColor: "transparent", borderWidth: 0 };
      case "danger":
        return { backgroundColor: colors.danger, borderWidth: 0 };
      case "primary":
      default:
        return { backgroundColor: colors.accent, borderWidth: 0 };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case "highlight":
      case "secondary":
        return colors.onSecondary;
      case "tonal":
        return colors.onAccentTonal;
      case "danger":
        return colors.textOnAccent;
      case "outline":
      case "ghost":
        return colors.accent;
      case "primary":
      default:
        return colors.onAccent;
    }
  };

  const textVariant: Record<ButtonSize, TypographyVariant> = {
    small: "label",
    medium: "bodyStrong",
    large: "subheading",
    xlarge: "heading",
  };

  const iconPx = iconSize ?? { small: 16, medium: 18, large: 20, xlarge: 22 }[size];

  const renderIcon = () => {
    if (!icon || iconPosition === "none" || loading) return null;
    return (
      <Ionicons
        name={icon}
        size={iconPx}
        color={iconColor ?? getTextColor()}
        style={iconPosition === "left" ? styles.iconLeft : styles.iconRight}
      />
    );
  };

  const isInactive = disabled || loading;
  const isFilled = variant === "primary";

  return (
    <Animated.View
      style={[fullWidth && styles.fullWidth, { transform: [{ scale }] }]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => !isInactive && springTo(motion.pressScale)}
        onPressOut={() => springTo(1)}
        disabled={isInactive}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isInactive, busy: loading }}
        style={({ pressed }) => [
          styles.button,
          sizeStyles[size],
          getVariantStyles(),
          fullWidth && styles.fullWidth,
          // Explicit disabled fill rather than dimming: opacity drags the
          // label below the contrast minimum.
          disabled && styles.disabled,
          pressed && !isInactive && (isFilled ? styles.pressedFilled : styles.pressedQuiet),
          style,
        ]}
      >
        {loading && (
          <ActivityIndicator
            size="small"
            color={getTextColor()}
            style={styles.loadingIndicator}
          />
        )}
        {!loading && iconPosition === "left" && renderIcon()}
        {/* Label keeps its text while loading so the button doesn't resize. */}
        <AppText
          variant={textVariant[size]}
          style={[
            styles.text,
            { color: getTextColor() },
            loading && styles.loadingText,
            textStyle,
          ]}
        >
          {title}
        </AppText>
        {!loading && iconPosition === "right" && renderIcon()}
      </Pressable>
    </Animated.View>
  );
};

const useStyles = makeStyles((t) => ({
  button: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: t.radius.pill,
    gap: t.spacing.sm,
  },
  fullWidth: { width: "100%" as const },
  disabled: {
    backgroundColor: t.colors.disabledSurface,
    borderColor: t.colors.disabledSurface,
  },
  // Colour darkens one step on press; the scale comes from the Animated wrapper.
  pressedFilled: { backgroundColor: t.colors.accentPressed },
  pressedQuiet: { backgroundColor: t.colors.pressed },
  loadingText: { opacity: 0.9 },
  text: { textAlign: "center" as const },
  iconLeft: { marginRight: t.spacing.xs },
  iconRight: { marginLeft: t.spacing.xs },
  loadingIndicator: { marginRight: t.spacing.sm },
}));

export default Button;

import React from "react";
import {
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";
import AppText, { type TypographyVariant } from "./AppText";

export type ButtonSize = "small" | "medium" | "large" | "xlarge";
export type ButtonVariant =
  "primary" | "tonal" | "secondary" | "outline" | "ghost" | "danger";
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
  /** Overrides the label as the screen-reader name (e.g. icon-heavy buttons). */
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

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case "small":
        // 44pt is the minimum comfortable touch target; "small" refers to the
        // visual weight, not a sub-minimum hit area.
        return {
          paddingVertical: 10,
          paddingHorizontal: 16,
          minHeight: 44,
        };
      case "medium":
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          minHeight: 48,
        };
      case "large":
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          minHeight: 56,
        };
      case "xlarge":
        return {
          paddingVertical: 20,
          paddingHorizontal: 32,
          minHeight: 64,
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          minHeight: 48,
        };
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: colors.accent,
          borderWidth: 0,
        };
      case "tonal":
        return {
          backgroundColor: colors.accentTonal,
          borderWidth: 0,
        };
      case "secondary":
        return {
          backgroundColor: colors.secondary,
          borderWidth: 0,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: colors.accent,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderWidth: 0,
        };
      case "danger":
        return {
          backgroundColor: colors.danger,
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: colors.accent,
          borderWidth: 0,
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case "primary":
        return colors.onAccent;
      case "tonal":
        return colors.onAccentTonal;
      case "secondary":
        return colors.onSecondary;
      case "danger":
        return colors.textOnAccent;
      case "outline":
      case "ghost":
        return colors.accent;
      default:
        return colors.onAccent;
    }
  };

  const getTextVariant = (): TypographyVariant => {
    switch (size) {
      case "small":
        return "label";
      case "medium":
        return "bodyStrong";
      case "large":
        return "heading";
      case "xlarge":
        return "title";
      default:
        return "bodyStrong";
    }
  };

  const getIconSize = (): number => {
    if (iconSize) return iconSize;

    switch (size) {
      case "small":
        return 16;
      case "medium":
        return 18;
      case "large":
        return 20;
      case "xlarge":
        return 22;
      default:
        return 18;
    }
  };

  const getIconColor = (): string => {
    if (iconColor) return iconColor;
    return getTextColor();
  };

  const renderIcon = () => {
    if (!icon || iconPosition === "none" || loading) return null;

    return (
      <Ionicons
        name={icon}
        size={getIconSize()}
        color={getIconColor()}
        style={[
          iconPosition === "left" && styles.iconLeft,
          iconPosition === "right" && styles.iconRight,
        ]}
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      // Keep the original label rather than swapping in "Loading...": the text
      // width stays put so the button doesn't resize, and the user doesn't
      // lose track of what is in flight.
      return (
        <>
          <ActivityIndicator
            size="small"
            color={getTextColor()}
            style={styles.loadingIndicator}
          />
          <AppText
            variant={getTextVariant()}
            style={[
              styles.text,
              { color: getTextColor() },
              styles.loadingText,
              textStyle,
            ]}
          >
            {title}
          </AppText>
        </>
      );
    }

    return (
      <>
        {iconPosition === "left" && renderIcon()}
        <AppText
          variant={getTextVariant()}
          style={[
            styles.text,
            { color: getTextColor() },
            textStyle,
          ]}
        >
          {title}
        </AppText>
        {iconPosition === "right" && renderIcon()}
      </>
    );
  };

  const isInactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        getSizeStyles(),
        getVariantStyles(),
        fullWidth && styles.fullWidth,
        // An explicit disabled fill rather than dimming the whole button:
        // opacity dragged the label below the contrast minimum.
        disabled && styles.disabled,
        pressed && !isInactive && styles.pressed,
        style,
      ]}
    >
      {renderContent()}
    </Pressable>
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
  fullWidth: {
    width: "100%" as const,
  },
  disabled: {
    backgroundColor: t.colors.disabledSurface,
    borderColor: t.colors.disabledSurface,
  },
  pressed: {
    opacity: 0.85,
    backgroundColor: t.colors.pressed,
  },
  loadingText: {
    opacity: 0.9,
  },
  text: {
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },
  iconLeft: {
    marginRight: t.spacing.xs,
  },
  iconRight: {
    marginLeft: t.spacing.xs,
  },
  loadingIndicator: {
    marginRight: t.spacing.sm,
  },
}));

export default Button;

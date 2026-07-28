import React from "react";
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

export type ButtonSize = "small" | "medium" | "large" | "xlarge";
export type ButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "danger";
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
  activeOpacity?: number;
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
  activeOpacity = 0.7,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case "small":
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          minHeight: 36,
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

  const getTextSize = (): number => {
    switch (size) {
      case "small":
        return 14;
      case "medium":
        return 16;
      case "large":
        return 18;
      case "xlarge":
        return 20;
      default:
        return 16;
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
      return (
        <>
          <ActivityIndicator
            size="small"
            color={getTextColor()}
            style={styles.loadingIndicator}
          />
          <Text
            style={[
              styles.text,
              { color: getTextColor(), fontSize: getTextSize() },
              textStyle,
            ]}
          >
            Loading...
          </Text>
        </>
      );
    }

    return (
      <>
        {iconPosition === "left" && renderIcon()}
        <Text
          style={[
            styles.text,
            { color: getTextColor(), fontSize: getTextSize() },
            textStyle,
          ]}
        >
          {title}
        </Text>
        {iconPosition === "right" && renderIcon()}
      </>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
      style={[
        styles.button,
        getSizeStyles(),
        getVariantStyles(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const useStyles = makeStyles((t) => ({
  button: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 25,
    gap: t.spacing.sm,
  },
  fullWidth: {
    width: "100%" as const,
  },
  disabled: {
    opacity: 0.6,
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

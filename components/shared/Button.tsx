import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ButtonSize = "small" | "medium" | "large" | "xlarge";
export type ButtonVariant =
  | "primary"
  | "secondary"
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
          backgroundColor: "#B6A3E2",
          borderWidth: 0,
        };
      case "secondary":
        return {
          backgroundColor: "#6B7280",
          borderWidth: 0,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: "#B6A3E2",
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderWidth: 0,
        };
      case "danger":
        return {
          backgroundColor: "#EF4444",
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: "#B6A3E2",
          borderWidth: 0,
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case "primary":
      case "secondary":
      case "danger":
        return "#FFFFFF";
      case "outline":
      case "ghost":
        return "#B6A3E2";
      default:
        return "#FFFFFF";
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

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    gap: 8,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
  loadingIndicator: {
    marginRight: 8,
  },
});

export default Button;

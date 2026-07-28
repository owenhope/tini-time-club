import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

export type InputSize = "small" | "medium" | "large";
export type InputVariant = "default" | "outlined" | "filled" | "transparent";
export type InputType = "text" | "email" | "password" | "number" | "multiline";

export interface InputProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: InputSize;
  variant?: InputVariant;
  type?: InputType;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  containerStyle?: ViewStyle;
  testID?: string;
}

const Input: React.FC<InputProps> = ({
  placeholder,
  value,
  onChangeText,
  label,
  error,
  disabled = false,
  size = "medium",
  variant = "default",
  type = "text",
  multiline = false,
  numberOfLines = 1,
  maxLength,
  autoCapitalize = "none",
  autoCorrect = false,
  keyboardType = "default",
  secureTextEntry = false,
  showPasswordToggle = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  containerStyle,
  testID,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Determine if this should be a password input
  const isPasswordInput = type === "password" || secureTextEntry;
  const shouldShowPasswordToggle = isPasswordInput && showPasswordToggle;
  const actualSecureTextEntry = isPasswordInput && !isPasswordVisible;

  // Determine keyboard type based on input type
  const getKeyboardType = () => {
    if (keyboardType !== "default") return keyboardType;
    switch (type) {
      case "email":
        return "email-address";
      case "number":
        return "numeric";
      default:
        return "default";
    }
  };

  const getSizeStyles = (): TextStyle => {
    switch (size) {
      case "small":
        return {
          paddingVertical: 8,
          paddingHorizontal: 12,
          minHeight: 36,
        };
      case "medium":
        return {
          paddingVertical: 12,
          paddingHorizontal: 16,
          minHeight: 48,
        };
      case "large":
        return {
          paddingVertical: 16,
          paddingHorizontal: 20,
          minHeight: 56,
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 16,
          minHeight: 48,
        };
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case "default":
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
        };
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: error ? colors.danger : colors.accent,
        };
      case "filled":
        return {
          backgroundColor: colors.surfaceSunken,
          borderWidth: 0,
        };
      case "transparent":
        // Sits over imagery in both themes, so it stays a fixed white scrim.
        return {
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
        };
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
      default:
        return 16;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textMuted;
    if (variant === "transparent") return colors.textOnImage;
    return colors.text;
  };

  const getPlaceholderColor = (): string => {
    if (variant === "transparent") return "rgba(255, 255, 255, 0.6)";
    return colors.textMuted;
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    return (
      <Ionicons
        name={leftIcon}
        size={20}
        color={getTextColor()}
        style={styles.leftIcon}
      />
    );
  };

  const renderRightIcon = () => {
    if (shouldShowPasswordToggle) {
      return (
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          style={styles.rightIcon}
        >
          <Ionicons
            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={getTextColor()}
          />
        </TouchableOpacity>
      );
    }

    if (rightIcon) {
      return (
        <TouchableOpacity
          onPress={onRightIconPress}
          style={styles.rightIcon}
          disabled={!onRightIconPress}
        >
          <Ionicons name={rightIcon} size={20} color={getTextColor()} />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: getTextColor() }]}>{label}</Text>
      )}

      <View style={[styles.inputContainer, getVariantStyles(), style]}>
        {renderLeftIcon()}

        <TextInput
          testID={testID}
          placeholder={placeholder}
          placeholderTextColor={getPlaceholderColor()}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          multiline={multiline || type === "multiline"}
          numberOfLines={multiline || type === "multiline" ? numberOfLines : 1}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={getKeyboardType()}
          secureTextEntry={actualSecureTextEntry}
          style={[
            styles.input,
            getSizeStyles(),
            {
              color: getTextColor(),
              fontSize: getTextSize(),
              textAlignVertical:
                multiline || type === "multiline" ? "top" : "center",
            },
            inputStyle,
          ]}
        />

        {renderRightIcon()}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    width: "100%" as const,
    marginVertical: t.spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 6,
    color: t.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 25,
    position: "relative" as const,
  },
  input: {
    flex: 1,
    paddingHorizontal: 0,
    color: t.colors.text,
  },
  leftIcon: {
    marginLeft: t.spacing.lg,
    marginRight: t.spacing.sm,
  },
  rightIcon: {
    marginRight: t.spacing.lg,
    marginLeft: t.spacing.sm,
    padding: t.spacing.xs,
  },
  errorText: {
    ...t.typography.label,
    fontWeight: "400" as const,
    letterSpacing: 0,
    color: t.colors.danger,
    marginTop: t.spacing.xs,
    marginLeft: t.spacing.xs,
  },
}));

export default Input;

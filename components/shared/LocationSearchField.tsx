import React from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

interface LocationSearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** Search control shared by review venues, home bars, and home cities. */
export default function LocationSearchField({
  value,
  onChangeText,
  placeholder,
  onClear,
  disabled = false,
  accessibilityLabel,
}: LocationSearchFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        editable={!disabled}
        accessibilityLabel={accessibilityLabel ?? placeholder}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClear ?? (() => onChangeText(""))}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
const useStyles = makeStyles((t) => ({
  container: { position: "relative" as const },
  input: {
    ...t.typography.input,
    backgroundColor: t.colors.surfaceSunken,
    height: 50,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: 0,
    paddingRight: 50,
    textAlignVertical: "center" as const,
    includeFontPadding: false,
    color: t.colors.inputText,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  clearButton: {
    position: "absolute" as const,
    right: 15,
    top: 15,
    padding: 2,
  },
}));

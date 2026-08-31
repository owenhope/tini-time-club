import React, { type ReactNode } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

interface ExploreSearchAreaProps {
  children: ReactNode;
}

/** The single header slot used by every Explore search mode. */
export function ExploreSearchArea({ children }: ExploreSearchAreaProps) {
  const styles = useStyles();
  return <View style={styles.area}>{children}</View>;
}

interface ExploreSearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
  trailing?: ReactNode;
  autoFocus?: boolean;
}

/**
 * Normalized Explore search chrome. Each mode owns its search behaviour but
 * shares this exact height, typography, spacing, clear action, and surface.
 */
export function ExploreSearchField({
  value,
  onChangeText,
  placeholder,
  onClear,
  trailing,
  autoFocus,
}: ExploreSearchFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Ionicons name="search-outline" size={20} color={colors.textMuted} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoFocus={autoFocus}
      />
      {trailing}
      {value.length > 0 ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClear ?? (() => onChangeText(""))}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  area: {
    backgroundColor: t.isDark ? t.colors.tabBar : t.colors.surfaceInk,
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.sm,
    zIndex: 20,
  },
  field: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    height: 48,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    ...t.elevation.card,
  },
  input: {
    ...t.typography.input,
    flex: 1,
    height: "100%",
    marginLeft: t.spacing.md,
    paddingVertical: 0,
    textAlignVertical: "center" as const,
    color: t.colors.inputText,
  },
  clearButton: {
    marginLeft: t.spacing.sm,
  },
}));

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

/**
 * A form row that opens a chooser: the current value (or a placeholder),
 * an optional subtitle, and an Add/Change action. Selected rows fill with
 * the active colour.
 */
export default function PickerRow({
  title,
  placeholder,
  subtitle,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  /** The chosen value; null shows the placeholder and an "Add" action. */
  title: string | null;
  placeholder: string;
  subtitle?: string | null;
  /** Shown before the title, e.g. a Golden Glass icon. */
  leading?: React.ReactNode;
  /** Shown after the title, e.g. a verified badge. */
  trailing?: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const selected = title != null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected && styles.containerSelected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.text}>
        <View style={styles.nameRow}>
          {leading}
          <Text
            style={[styles.name, selected && styles.textSelected]}
            numberOfLines={1}
          >
            {title ?? placeholder}
          </Text>
          {trailing}
        </View>
        {subtitle ? (
          <Text
            style={[styles.address, selected && styles.textSelected]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.action, selected && styles.textSelected]}>
        {selected ? "Change" : "Add"}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={selected ? "#FFFFFF" : colors.textMuted}
      />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    minHeight: 58,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.thumb,
    backgroundColor: t.colors.background,
  },
  containerSelected: {
    borderColor: t.colors.tabBarActive,
    backgroundColor: t.colors.tabBarActive,
  },
  pressed: {
    opacity: 0.65,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
    minWidth: 0,
  },
  name: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  address: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  action: {
    ...t.typography.label,
    color: t.colors.accent,
  },
  textSelected: {
    color: "#FFFFFF",
  },
}));

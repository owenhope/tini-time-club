import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import type { FavoriteLocationValue } from "@/services/favoriteLocationSelection";
import { makeStyles, useTheme } from "@/theme";

interface FavoriteLocationPickerProps {
  value: FavoriteLocationValue | null;
  onPress: () => void;
}

const FavoriteLocationPicker: React.FC<FavoriteLocationPickerProps> = ({
  value,
  onPress,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const selected = Boolean(value);
  const subtitle =
    value?.address && value.name
      ? formatCityRegion(stripNameFromAddress(value.name, value.address))
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected && styles.containerSelected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        value
          ? `Change favorite location, currently ${value.name}`
          : "Add favorite location"
      }
      accessibilityHint="Opens the location chooser"
    >
      <View style={styles.text}>
        <Text
          style={[styles.name, selected && styles.textSelected]}
          numberOfLines={1}
        >
          {value?.name ?? "Add favorite location"}
        </Text>
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
        {value ? "Change" : "Add"}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={selected ? "#FFFFFF" : colors.textMuted}
      />
    </Pressable>
  );
};

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
    borderRadius: t.radius.md,
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

export default FavoriteLocationPicker;

import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRESS_SCALE, makeStyles, useTheme } from "@/theme";
import AppText from "./AppText";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Sits on a green/ink ground rather than paper. */
  onInk?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pill filter chip — spirit, type, distance. Selection is a 2px green border
 * plus the chartreuse fill, per the system's selected state.
 */
const Chip: React.FC<ChipProps> = ({
  label,
  selected,
  onPress,
  icon,
  onInk,
  disabled,
  style,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  const textTone = selected ? "default" : onInk ? "onImage" : "secondary";
  const iconColor = selected
    ? colors.onHighlight
    : onInk
      ? colors.textOnImage
      : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        onInk && styles.onInk,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={iconColor} /> : null}
      <AppText
        variant="label"
        tone={textTone}
        style={selected ? { color: colors.onHighlight } : undefined}
      >
        {label}
      </AppText>
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs + 2,
    minHeight: 34,
    paddingHorizontal: t.spacing.md + 2,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  onInk: {
    backgroundColor: "transparent",
    borderColor: "rgba(250,249,246,0.35)",
  },
  selected: {
    backgroundColor: t.colors.highlight,
    borderWidth: 2,
    // The chartreuse fill carries green ink, so it takes a green edge too —
    // the primary purple would be a third colour on one 34pt control.
    borderColor: t.colors.secondary,
  },
  disabled: {
    opacity: 0.38,
  },
  pressed: {
    transform: [{ scale: PRESS_SCALE }],
  },
}));

export default Chip;

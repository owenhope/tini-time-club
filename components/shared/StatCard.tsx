import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { PRESS_SCALE, makeStyles } from "@/theme";
import AppText from "./AppText";

export interface StatCardProps {
  value: string | number;
  label: string;
  /** `ink` for the deep-green profile and bar headers. */
  tone?: "default" | "ink";
  size?: "regular" | "compact";
  /** Counts that navigate — followers, following. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A display-weight numeral under a small label — the "oversized stat numeral"
 * motif, sized down for app chrome.
 */
const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  tone = "default",
  size = "regular",
  onPress,
  style,
}) => {
  const styles = useStyles();
  const onInk = tone === "ink";
  const compact = size === "compact";

  const content = (
    <>
      <AppText
        variant={onInk ? "eyebrow" : "micro"}
        tone={onInk ? "onImage" : "muted"}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={compact && styles.compactLabel}
      >
        {label}
      </AppText>
      <AppText
        variant="metric"
        tone={onInk ? "onImage" : "default"}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={compact && styles.compactValue}
      >
        {value}
      </AppText>
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[
          styles.card,
          compact && styles.compact,
          onInk && styles.ink,
          style,
        ]}
        accessible
        accessibilityLabel={`${value} ${label}`}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compact,
        onInk && styles.ink,
        pressed && styles.pressed,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  card: {
    flex: 1,
    gap: t.spacing.xs,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.thumb,
    backgroundColor: t.colors.surfaceSunken,
  },
  compact: {
    minHeight: 48,
    gap: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  compactValue: {
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 0,
  },
  compactLabel: {
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0,
  },
  ink: {
    // A lift off the green ground rather than a second colour.
    backgroundColor: "rgba(250,249,246,0.10)",
  },
  pressed: {
    transform: [{ scale: PRESS_SCALE }],
    opacity: 0.85,
  },
}));

export default StatCard;

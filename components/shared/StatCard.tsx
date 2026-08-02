import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { makeStyles } from "@/theme";
import AppText from "./AppText";

export interface StatCardProps {
  value: string | number;
  label: string;
  /** `ink` for the deep-green profile and bar headers. */
  tone?: "default" | "ink";
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
  style,
}) => {
  const styles = useStyles();
  const onInk = tone === "ink";

  return (
    <View
      style={[styles.card, onInk && styles.ink, style]}
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <AppText variant="metric" tone={onInk ? "onImage" : "default"}>
        {value}
      </AppText>
      <AppText variant="micro" tone={onInk ? "onImage" : "muted"}>
        {label}
      </AppText>
    </View>
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
  ink: {
    // A lift off the green ground rather than a second colour.
    backgroundColor: "rgba(250,249,246,0.10)",
  },
}));

export default StatCard;

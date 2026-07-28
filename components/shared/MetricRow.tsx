import React from "react";
import { View, Text, Pressable } from "react-native";
import { makeStyles } from "@/theme";

export interface Metric {
  key: string;
  value: number | string;
  label: string;
  onPress?: () => void;
  /** Screen-reader name; defaults to "<value> <label>". */
  accessibilityLabel?: string;
}

/**
 * Horizontal strip of counts (reviews / followers / following, and the like).
 *
 * Tappable and static metrics render identically, so a follower count that
 * navigates looks the same as a review count that doesn't — the difference is
 * carried by role and hint rather than by styling, which keeps the row even.
 */
const MetricRow: React.FC<{
  metrics: Metric[];
  /** "center" stacks value over label, for the row beside an avatar. */
  align?: "left" | "center";
}> = ({ metrics, align = "left" }) => {
  const styles = useStyles();

  return (
    <View style={styles.row}>
      {metrics.map((metric) => {
        const label =
          metric.accessibilityLabel ?? `${metric.value} ${metric.label}`;

        if (!metric.onPress) {
          return (
            <View
              key={metric.key}
              style={[styles.item, align === "center" && styles.centered]}
              accessible
              accessibilityLabel={label}
            >
              <Text style={styles.value}>{metric.value}</Text>
              <Text style={styles.label}>{metric.label}</Text>
            </View>
          );
        }

        return (
          <Pressable
            key={metric.key}
            style={({ pressed }) => [
              styles.item,
              align === "center" && styles.centered,
              pressed && styles.pressed,
            ]}
            onPress={metric.onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={`Shows ${metric.label.toLowerCase()}`}
          >
            <Text style={styles.value}>{metric.value}</Text>
            <Text style={styles.label}>{metric.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  item: {
    flex: 1,
    // 44pt minimum touch target for the tappable ones; applied to all so the
    // row keeps a single baseline.
    minHeight: 44,
    justifyContent: "center" as const,
    paddingVertical: t.spacing.xs,
  },
  centered: {
    alignItems: "center" as const,
  },
  pressed: {
    opacity: 0.6,
  },
  value: {
    ...t.typography.metric,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  label: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
}));

export default MetricRow;

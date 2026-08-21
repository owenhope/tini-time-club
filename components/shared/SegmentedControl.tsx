import React from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { makeStyles } from "@/theme";

export interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
}

export interface SegmentedControlProps<Value extends string> {
  value: Value;
  options: readonly SegmentedControlOption<Value>[];
  onChange: (value: Value) => void;
  style?: StyleProp<ViewStyle>;
  tone?: "default" | "ink" | "brand";
}

/** The app-wide text-only segmented control used to switch peer views. */
const SegmentedControl = <Value extends string>({
  value,
  options,
  onChange,
  style,
  tone = "default",
}: SegmentedControlProps<Value>) => {
  const styles = useStyles();
  const onInk = tone === "ink";
  const onBrand = tone === "brand";

  return (
    <View
      style={[
        styles.container,
        onInk && styles.containerInk,
        onBrand && styles.containerBrand,
        style,
      ]}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              selected && onInk && styles.segmentSelectedInk,
              selected && onBrand && styles.segmentSelectedBrand,
              pressed && styles.segmentPressed,
            ]}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[
                styles.label,
                onInk && styles.labelInk,
                onInk && !selected && styles.labelInkIdle,
                onBrand && styles.labelBrand,
                selected && styles.labelSelected,
                selected && onInk && styles.labelSelectedInk,
                selected && onBrand && styles.labelSelectedBrand,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: "row" as const,
    padding: t.spacing.xs,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    ...t.elevation.card,
  },
  containerInk: {
    borderColor: t.colors.ratingTrackOnInk,
    backgroundColor: t.colors.ratingTrackOnInk,
    shadowOpacity: 0,
    elevation: 0,
  },
  containerBrand: {
    borderColor: "transparent",
    backgroundColor: "rgba(250, 249, 246, 0.16)",
    shadowOpacity: 0,
    elevation: 0,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: "transparent",
  },
  segmentSelected: {
    backgroundColor: t.colors.accent,
  },
  segmentSelectedInk: {
    backgroundColor: t.isDark ? t.colors.tabBar : t.colors.surfaceInkDeep,
  },
  segmentSelectedBrand: {
    backgroundColor: t.colors.headerBrand,
  },
  segmentPressed: {
    opacity: 0.7,
  },
  label: {
    ...t.typography.bodyStrong,
    letterSpacing: 0,
    color: t.colors.textSecondary,
  },
  labelSelected: {
    color: t.colors.onAccent,
  },
  labelInk: {
    color: t.colors.onInk,
  },
  labelInkIdle: {
    opacity: 0.78,
  },
  labelBrand: {
    color: t.colors.onHeaderBrand,
    opacity: 0.84,
  },
  labelSelectedInk: {
    color: t.colors.onInk,
  },
  labelSelectedBrand: {
    color: t.colors.onHeaderBrand,
  },
}));

export default SegmentedControl;

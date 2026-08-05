import React from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { fonts, makeStyles } from "@/theme";

export interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
}

export interface SegmentedControlProps<Value extends string> {
  value: Value;
  options: readonly SegmentedControlOption<Value>[];
  onChange: (value: Value) => void;
  style?: StyleProp<ViewStyle>;
}

/** The app-wide text-only segmented control used to switch peer views. */
const SegmentedControl = <Value extends string>({
  value,
  options,
  onChange,
  style,
}: SegmentedControlProps<Value>) => {
  const styles = useStyles();

  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
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
    backgroundColor: t.colors.highlight,
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
    fontFamily: fonts.bold,
    color: t.colors.onHighlight,
  },
}));

export default SegmentedControl;

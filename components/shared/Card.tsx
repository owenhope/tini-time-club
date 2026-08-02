import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { PRESS_SCALE, makeStyles } from "@/theme";

export type CardTone = "default" | "onColour" | "sunken";

export interface CardProps {
  children: React.ReactNode;
  /**
   * `onColour` drops the shadow for cards laid on a green or purple ground,
   * where a green-tinted shadow reads as dirt rather than lift.
   */
  tone?: CardTone;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The content surface: hairline border plus a low green-tinted shadow, at the
 * card radius. Every repeating object in the app — a review, a place, a
 * profile row — sits in one of these.
 */
const Card: React.FC<CardProps> = ({
  children,
  tone = "default",
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}) => {
  const styles = useStyles();
  const base = [
    styles.card,
    tone === "onColour" && styles.onColour,
    tone === "sunken" && styles.sunken,
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    ...t.elevation.card,
  },
  onColour: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sunken: {
    backgroundColor: t.colors.surfaceSunken,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    transform: [{ scale: PRESS_SCALE }],
    backgroundColor: t.colors.pressed,
  },
}));

export default Card;

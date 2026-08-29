import React from "react";
import { Alert, Pressable, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

export interface LocationVerifiedBadgeProps {
  compact?: boolean;
  color?: string;
}

/** Location verification is a business claim review, not profile verification. */
const LocationVerifiedBadge = ({
  compact = false,
  color,
}: LocationVerifiedBadgeProps) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const explain = () =>
    Alert.alert(
      "Verified business",
      "Tini Time Club manually reviewed this business claim. Verification is not an endorsement."
    );

  return (
    <Pressable
      onPress={explain}
      accessibilityRole="button"
      accessibilityLabel="Verified business"
      accessibilityHint="Explains what business verification means"
      hitSlop={6}
      style={compact ? styles.compact : styles.badge}
    >
      <MaterialIcons
        name="verified"
        size={compact ? 20 : 18}
        color={color ?? colors.accent}
      />
      {!compact ? <Text style={styles.label}>Verified business</Text> : null}
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  badge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  compact: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  label: {
    ...t.typography.caption,
    color: t.colors.accent,
    fontWeight: "700" as const,
  },
}));

export default LocationVerifiedBadge;

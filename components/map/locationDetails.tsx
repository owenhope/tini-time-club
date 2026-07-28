import { Link } from "expo-router";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { stripNameFromAddress } from "@/utils/helpers";
import { RatingSummary } from "@/components/shared";
import { makeStyles } from "@/theme";

interface LocationDetailsProps {
  loc: any;
}

/**
 * The bottom sheet shown when a map pin is tapped.
 *
 * Uses the same full RatingSummary as the place profile and review card, so
 * the three surfaces read identically.
 */
const LocationDetails: React.FC<LocationDetailsProps> = ({ loc }) => {
  const styles = useStyles();

  const address = loc.address
    ? stripNameFromAddress(loc.name, loc.address)
    : null;

  return (
    <View style={styles.sheet}>
      <Link href={`/(tabs)/locations/${loc.id}`} asChild>
        <Pressable
          style={({ pressed }) => [styles.titleRow, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel={loc.name || "No name available"}
          accessibilityHint="Opens this place's profile"
        >
          <Text style={styles.name} numberOfLines={1}>
            {loc.name || "No name available"}
          </Text>
        </Pressable>
      </Link>

      <Text style={styles.address} numberOfLines={2}>
        {address ?? "No address available"}
      </Text>

      <View style={styles.ratings}>
        <RatingSummary
          overall={loc.rating}
          taste={loc.taste_avg}
          presentation={loc.presentation_avg}
          reviewCount={loc.total_ratings ?? 0}
        />
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  sheet: {
    paddingHorizontal: t.spacing.xl,
    paddingVertical: t.spacing.xl,
    backgroundColor: t.colors.surface,
    gap: t.spacing.xs,
  },
  titleRow: {
    justifyContent: "center" as const,
    minHeight: 44,
    alignSelf: "stretch" as const,
  },
  pressed: {
    opacity: 0.6,
  },
  name: {
    ...t.typography.title,
    color: t.colors.text,
  },
  address: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    lineHeight: 20,
  },
  ratings: {
    marginTop: t.spacing.sm,
  },
}));

export default LocationDetails;

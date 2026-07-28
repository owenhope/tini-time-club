import { Link, useRouter } from "expo-router";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { stripNameFromAddress } from "@/utils/helpers";
import { Button, RatingSummary } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";

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
  const router = useRouter();
  const { colors } = useTheme();

  const address = loc.address
    ? stripNameFromAddress(loc.name, loc.address)
    : null;

  return (
    <View style={styles.sheet}>
      <Link href={`/places/${loc.id}`} asChild>
        <Pressable
          style={({ pressed }) => [styles.titleRow, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel={loc.name || "No name available"}
          accessibilityHint="Opens this place's profile"
        >
          <Text style={styles.name} numberOfLines={1}>
            {loc.name || "No name available"}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={colors.accent}
          />
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

      <Button
        title="View place"
        onPress={() => router.push(`/places/${loc.id}`)}
        variant="primary"
        size="medium"
        icon="arrow-forward"
        iconPosition="right"
        fullWidth
        style={styles.viewPlaceButton}
        accessibilityHint={`Opens the profile for ${loc.name || "this place"}`}
      />
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
    minHeight: 44,
    alignSelf: "stretch" as const,
  },
  pressed: {
    opacity: 0.6,
  },
  name: {
    ...t.typography.title,
    color: t.colors.text,
    flex: 1,
  },
  address: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    lineHeight: 20,
  },
  ratings: {
    marginTop: t.spacing.sm,
  },
  viewPlaceButton: {
    marginTop: t.spacing.lg,
  },
}));

export default LocationDetails;

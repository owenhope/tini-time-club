import { Link } from "expo-router";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { stripNameFromAddress } from "@/utils/helpers";
import { RatingSummary } from "@/components/shared";
import Regulars, { RegularsSkeleton } from "@/components/Regulars";
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
            {"\u00a0"}
            <Ionicons name="chevron-forward" size={20} color={colors.accent} />
          </Text>
        </Pressable>
      </Link>

      <Text style={styles.address} numberOfLines={2}>
        {address ?? "No address available"}
      </Text>

      <View style={styles.overview}>
        <View style={styles.overviewColumns}>
          <View style={styles.ratings}>
            <RatingSummary
              overall={loc.rating}
              taste={loc.taste_avg}
              presentation={loc.presentation_avg}
              reviewCount={loc.total_ratings ?? 0}
              countPlacement="score"
              showOverallMeta={false}
              showOverallHeading
              overallPlacement="right"
              breakdownLayout="stacked"
            />
          </View>

          {loc.regulars === undefined ? (
            // Regulars arrive in a second fetch after the pins; hold their
            // column open so the rating block doesn't stretch full width and
            // then snap back when they land.
            <View style={styles.regulars}>
              <RegularsSkeleton />
            </View>
          ) : loc.regulars.length ? (
            <View style={styles.regulars}>
              <Regulars regulars={loc.regulars} variant="dense" />
            </View>
          ) : null}
        </View>
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
    minWidth: 0,
  },
  address: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    lineHeight: 20,
  },
  overview: {
    marginTop: t.spacing.sm,
  },
  overviewColumns: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.xl,
  },
  ratings: {
    flex: 1,
    minWidth: 0,
  },
  regulars: {
    width: "42%" as const,
    minWidth: 128,
    maxWidth: 168,
  },
}));

export default LocationDetails;

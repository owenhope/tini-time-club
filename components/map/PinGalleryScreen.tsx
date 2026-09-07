import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocationPin from "@/components/map/locationPin";
import { makeStyles, useTheme } from "@/theme";

/**
 * Dev-only reference sheet of every map pin variant, in both idle and
 * selected states, so pin styling can be reviewed without seeding the map.
 * Reached from the __DEV__ button on the Explore map.
 */

const BASE = {
  id: 0,
  name: "Pin preview",
  lat: 49.28,
  long: -123.12,
};

// The map only ever shows reviewed places (locations_in_view inner-joins
// reviews), so there is no unrated pin state to preview.
const VARIANTS = [
  {
    label: "Rated",
    note: "Standard reviewed place.",
    loc: { ...BASE, rating: 4.0, total_ratings: 3 },
  },
  {
    label: "Verified",
    note: "Active business verification — the badge's check overlay.",
    loc: {
      ...BASE,
      rating: 4.5,
      total_ratings: 3,
      is_location_verified: true,
    },
  },
  {
    label: "Golden Glass",
    note: "Current Golden Glass recognition.",
    loc: { ...BASE, rating: 5.0, total_ratings: 5, is_golden_glass: true },
  },
  {
    label: "Golden + verified",
    note: "Golden Glass styling wins; check overlay remains.",
    loc: {
      ...BASE,
      rating: 4.8,
      total_ratings: 5,
      is_golden_glass: true,
      is_location_verified: true,
    },
  },
] as const;

/** Mirrors ExploreMap's ClusterPin (which is private to that file). */
const ClusterPreview = ({ count }: { count: number }) => {
  const styles = useStyles();
  const size = count >= 25 ? 66 : count >= 10 ? 58 : 48;

  return (
    <View
      style={[
        styles.clusterPin,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.clusterCount}>{count}</Text>
    </View>
  );
};

export default function PinGalleryScreen() {
  const styles = useStyles();
  const { isDark, setPreference } = useTheme();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.introRow}>
        <Text style={styles.intro} selectable>
          Every map pin variant, idle and selected. Dev builds only.
        </Text>
        <Pressable
          onPress={() => setPreference(isDark ? "light" : "dark")}
          style={({ pressed }) => [
            styles.themeToggle,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
          <Ionicons
            name={isDark ? "sunny" : "moon"}
            size={18}
            color={styles.themeToggleIcon.color}
          />
        </Pressable>
      </View>
      <View style={styles.columnsHeader}>
        <Text style={styles.columnLabel}>IDLE</Text>
        <Text style={styles.columnLabel}>SELECTED</Text>
      </View>
      {VARIANTS.map((variant) => (
        <View key={variant.label} style={styles.card}>
          <View style={styles.pinRow}>
            <View style={styles.pinCell}>
              <LocationPin loc={variant.loc} />
            </View>
            <View style={styles.pinCell}>
              <LocationPin loc={variant.loc} selected />
            </View>
          </View>
          <Text style={styles.cardTitle} selectable>
            {variant.label}
          </Text>
          <Text style={styles.cardNote} selectable>
            {variant.note}
          </Text>
        </View>
      ))}
      <View style={styles.card}>
        <View style={styles.pinRow}>
          <View style={styles.pinCell}>
            <ClusterPreview count={3} />
          </View>
          <View style={styles.pinCell}>
            <ClusterPreview count={25} />
          </View>
        </View>
        <Text style={styles.cardTitle} selectable>
          Cluster
        </Text>
        <Text style={styles.cardNote} selectable>
          Grouped pins; grows at 10 and 25 places.
        </Text>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    padding: t.spacing.gutter,
    paddingBottom: t.spacing.xxl,
    gap: t.spacing.md,
  },
  introRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  intro: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    flex: 1,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  themeToggleIcon: {
    color: t.colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
  columnsHeader: {
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  columnLabel: {
    ...t.typography.eyebrow,
    color: t.colors.textMuted,
    flex: 1,
    textAlign: "center" as const,
  },
  card: {
    gap: t.spacing.xs,
    padding: t.spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.surface,
  },
  pinRow: {
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  pinCell: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    minHeight: 88,
  },
  cardTitle: {
    ...t.typography.heading,
    color: t.colors.text,
  },
  cardNote: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  clusterPin: {
    backgroundColor: t.colors.surfaceBrand,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    ...t.elevation.raised,
  },
  clusterCount: {
    ...t.typography.heading,
    position: "absolute" as const,
    color: t.colors.onAccentTonal,
    textAlign: "center" as const,
    fontVariant: ["tabular-nums"] as const,
  },
}));

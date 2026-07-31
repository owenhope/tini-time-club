import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ProfileRegularPlace } from "@/services/regularsService";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import { makeStyles, useTheme } from "@/theme";

const RegularPlaceRow: React.FC<{ place: ProfileRegularPlace }> = ({
  place,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const subtitle = place.location_address
    ? formatCityRegion(
        stripNameFromAddress(place.location_name, place.location_address)
      )
    : null;

  return (
    <Pressable
      onPress={() => router.push(`/places/${place.location_id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`Number ${place.rank} regular at ${place.location_name}`}
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rank}>#{place.rank}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {place.location_name}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.count}>
          {place.review_count} {place.review_count === 1 ? "review" : "reviews"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: 76,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  pressed: {
    opacity: 0.65,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentSubtle,
  },
  rank: {
    ...t.typography.label,
    fontWeight: "700" as const,
    color: t.colors.accent,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  subtitle: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  count: {
    ...t.typography.caption,
    color: t.colors.accent,
    marginTop: 2,
  },
}));

export default RegularPlaceRow;

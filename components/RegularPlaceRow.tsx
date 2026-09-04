import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ProfileRegularPlace } from "@/services/regularsService";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import {
  AppText,
  LocationVerifiedBadge,
  MartiniIcon,
} from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";

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
      onPress={() => router.push(routes.place(place.location_id))}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`${place.location_name}, ${place.review_count} ${place.review_count === 1 ? "review" : "reviews"}`}
    >
      <View style={styles.content}>
        <View style={styles.nameRow}>
          {place.is_golden_glass ? (
            <MartiniIcon size={20} color={colors.awardGold} filled />
          ) : null}
          <AppText variant="bodyStrong" style={styles.name} numberOfLines={2}>
            {place.location_name}
          </AppText>
          {place.is_location_verified ? (
            <LocationVerifiedBadge compact />
          ) : null}
        </View>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {subtitle ? `${subtitle} · ` : ""}
          {place.review_count} {place.review_count === 1 ? "review" : "reviews"}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    marginHorizontal: t.spacing.gutter,
    marginBottom: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.card,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    ...t.elevation.card,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: t.spacing.xs,
  },
  name: {
    flexShrink: 1,
    color: t.colors.usernameText,
  },
  nameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
    minWidth: 0,
  },
}));

export default RegularPlaceRow;

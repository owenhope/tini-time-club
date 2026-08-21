import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import { Avatar, RatingPips } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { formatRating } from "@/utils/ratingUtils";
import { routes } from "@/utils/routes";
import { useMembership } from "@/context/membership-context";

interface LocationDetailsProps {
  loc: any;
  onRegularsPress?: () => void;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({
  loc,
  onRegularsPress,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { requireMembership } = useMembership();

  const cityCountry = loc.address
    ? formatCityRegion(stripNameFromAddress(loc.name, loc.address))
    : null;
  const reviewCount = loc.total_ratings ?? 0;
  const reviewLabel = `${reviewCount} ${
    reviewCount === 1 ? "review" : "reviews"
  }`;
  const regulars = loc.regulars?.slice(0, 3) ?? [];
  const hasRating = loc.rating != null && reviewCount > 0;

  const openLocation = () => {
    if (requireMembership("location-details")) {
      router.push(routes.place(loc.id));
    }
  };

  const openRegulars = () => {
    if (requireMembership("location-details")) onRegularsPress?.();
  };

  return (
    <View style={styles.content}>
      <View style={styles.identity}>
        <Pressable
          style={({ pressed }) => [
            styles.titlePressable,
            pressed && styles.pressed,
          ]}
          onPress={openLocation}
          accessibilityRole="link"
          accessibilityLabel={`View ${loc.name}`}
          accessibilityHint="Opens the location page"
          hitSlop={6}
        >
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>
              {loc.name || "No name available"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.accent}
              pointerEvents="none"
            />
          </View>
        </Pressable>

        {cityCountry ? (
          <Text style={styles.meta} numberOfLines={1}>
            {cityCountry}
          </Text>
        ) : null}
      </View>

      <View style={styles.detailRow}>
        <View
          style={styles.metricBlock}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={
            hasRating
              ? `Overall ${formatRating(loc.rating)} from ${reviewLabel}`
              : "Not yet rated"
          }
        >
          <Text style={styles.eyebrow}>OVERALL</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.score}>
              {hasRating ? formatRating(loc.rating) : "--"}
            </Text>
            {hasRating ? (
              <View style={styles.ratingPips}>
                <RatingPips
                  value={loc.rating}
                  size={15}
                  accessibilityLabel=""
                />
              </View>
            ) : null}
          </View>
          <Text style={styles.reviewCount} numberOfLines={1}>
            {reviewLabel}
          </Text>
        </View>

        {regulars.length > 0 ? (
          <Pressable
            style={({ pressed }) => [
              styles.regularsBlock,
              pressed && styles.pressed,
            ]}
            onPress={openRegulars}
            accessibilityRole="button"
            accessibilityLabel={`Show regulars at ${loc.name}`}
          >
            <Text style={styles.eyebrow}>REGULARS</Text>
            <View
              style={styles.regularAvatars}
              accessibilityLabel={`${regulars.length} regulars`}
            >
              {regulars.map((regular: any, index: number) => (
                <View
                  key={regular.profile_id ?? `${regular.username}-${index}`}
                  style={[
                    styles.regularAvatar,
                    index > 0 && styles.regularAvatarOverlap,
                  ]}
                >
                  <Avatar
                    avatarPath={regular.avatar_url}
                    username={regular.username}
                    reviewCount={regular.profile_review_count}
                    size={32}
                  />
                </View>
              ))}
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  content: {
    gap: t.spacing.sm,
    paddingTop: t.spacing.xs,
  },
  identity: {
    gap: 0,
  },
  titlePressable: {
    alignSelf: "stretch" as const,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: t.spacing.xs,
    minWidth: 0,
    maxWidth: "100%" as const,
  },
  name: {
    ...t.typography.heading,
    color: t.colors.usernameText,
    flexShrink: 1,
  },
  meta: {
    ...t.typography.mono,
    color: t.colors.textSecondary,
  },
  detailRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.lg,
  },
  metricBlock: {
    gap: t.spacing.xs,
  },
  ratingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  ratingPips: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceSunken,
  },
  eyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.textMuted,
  },
  score: {
    ...t.typography.display,
    color: t.isDark ? t.colors.textSecondary : t.colors.secondary,
    fontVariant: ["tabular-nums"] as const,
  },
  reviewCount: {
    ...t.typography.mono,
    color: t.colors.textMuted,
  },
  regularsBlock: {
    alignItems: "flex-end" as const,
    gap: t.spacing.xs,
    paddingTop: 1,
  },
  pressed: {
    opacity: 0.65,
  },
  regularAvatars: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 38,
    alignSelf: "flex-start" as const,
  },
  regularAvatar: {
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
  },
  regularAvatarOverlap: {
    marginLeft: -8,
  },
}));

export default LocationDetails;

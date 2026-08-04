import { Link } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import { Avatar } from "@/components/shared";
import { makeStyles } from "@/theme";
import { formatRating } from "@/utils/ratingUtils";
import { routes } from "@/utils/routes";

interface LocationDetailsProps {
  loc: any;
  onRegularsPress?: () => void;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({
  loc,
  onRegularsPress,
}) => {
  const styles = useStyles();

  const cityCountry = loc.address
    ? formatCityRegion(stripNameFromAddress(loc.name, loc.address))
    : null;
  const reviewCount = loc.total_ratings ?? 0;
  const reviewLabel = `${reviewCount} ${
    reviewCount === 1 ? "review" : "reviews"
  }`;
  const regulars = loc.regulars?.slice(0, 3) ?? [];
  const hasRating = loc.rating != null && reviewCount > 0;

  return (
    <View style={styles.content}>
      <Link href={routes.place(loc.id)} asChild>
        <Pressable style={styles.titlePressable} accessibilityRole="link">
          <Text style={styles.name} numberOfLines={2}>
            {loc.name || "No name available"}
          </Text>
        </Pressable>
      </Link>

      {cityCountry ? (
        <Text style={styles.meta} numberOfLines={1}>
          {cityCountry}
        </Text>
      ) : null}

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
          <Text style={styles.eyebrow}>Overall</Text>
          <Text style={styles.score}>
            {hasRating ? formatRating(loc.rating) : "--"}
          </Text>
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
            onPress={onRegularsPress}
            accessibilityRole="button"
            accessibilityLabel={`Show regulars at ${loc.name}`}
          >
            <Text style={styles.eyebrow}>Regulars</Text>
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
    gap: t.spacing.xs,
    paddingTop: t.spacing.sm,
  },
  titlePressable: {
    minWidth: 0,
  },
  name: {
    ...t.typography.title,
    color: t.colors.text,
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
    paddingTop: t.spacing.lg - 2,
  },
  metricBlock: {
    gap: t.spacing.xs,
  },
  eyebrow: {
    ...t.typography.eyebrow,
    fontSize: 10,
    color: t.colors.textMuted,
  },
  score: {
    ...t.typography.metricLarge,
    color: t.colors.secondary,
    fontVariant: ["tabular-nums"] as const,
  },
  reviewCount: {
    ...t.typography.mono,
    color: t.colors.textSecondary,
  },
  regularsBlock: {
    alignItems: "flex-end" as const,
    gap: t.spacing.sm,
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

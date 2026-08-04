import { Link } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { stripNameFromAddress } from "@/utils/helpers";
import { Avatar, RatingPips } from "@/components/shared";
import { makeStyles } from "@/theme";
import { formatRating } from "@/utils/ratingUtils";
import { routes } from "@/utils/routes";

interface LocationDetailsProps {
  loc: any;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({ loc }) => {
  const styles = useStyles();

  const address = loc.address
    ? stripNameFromAddress(loc.name, loc.address)
    : "No address available";
  const reviewCount = loc.total_ratings ?? 0;
  const regulars = loc.regulars?.slice(0, 3) ?? [];
  const hasRating = loc.rating != null && reviewCount > 0;

  return (
    <View style={styles.content}>
      <View style={styles.heroRow}>
        <View style={styles.identity}>
          <View style={styles.titleLine}>
            <Link href={routes.place(loc.id)} asChild>
              <Pressable style={styles.titlePressable} accessibilityRole="link">
                <Text style={styles.name} numberOfLines={2}>
                  {loc.name || "No name available"}
                </Text>
              </Pressable>
            </Link>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {address}
          </Text>

          <View style={styles.ratingRow}>
            <Text style={styles.score}>
              {hasRating ? formatRating(loc.rating) : "--"}
            </Text>
            <RatingPips value={loc.rating ?? 0} size={14} accessibilityLabel="" />
            <Text style={styles.reviewCount} numberOfLines={1}>
              {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
            </Text>
          </View>

          {regulars.length > 0 ? (
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
                    size={28}
                  />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  content: {
    gap: t.spacing.md,
    paddingTop: t.spacing.sm,
  },
  heroRow: {
    alignItems: "stretch" as const,
  },
  identity: {
    minWidth: 0,
    gap: t.spacing.sm,
  },
  titleLine: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  titlePressable: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...t.typography.title,
    color: t.colors.text,
  },
  meta: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  ratingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    flexWrap: "wrap" as const,
  },
  score: {
    ...t.typography.metric,
    color: t.colors.secondary,
    fontVariant: ["tabular-nums"] as const,
  },
  reviewCount: {
    ...t.typography.bodyStrong,
    color: t.colors.textSecondary,
  },
  regularAvatars: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 34,
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

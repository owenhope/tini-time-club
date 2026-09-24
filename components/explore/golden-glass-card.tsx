import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MemberAvatar,
  LocationVerifiedBadge,
  MartiniIcon,
  RatingPips,
} from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import { formatRating } from "@/utils/ratingUtils";
import type { GoldenGlassRecipient } from "@/services/goldenGlassService";

export function GoldenGlassCard({
  item,
  onPress,
  reviewCount,
}: {
  item: GoldenGlassRecipient;
  onPress?: () => void;
  /** Public venue previews use their published review total. */
  reviewCount?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const location = item.neighborhood
    ? item.neighborhood
    : item.address
      ? formatCityRegion(stripNameFromAddress(item.venueName, item.address))
      : null;
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "link" : "summary"}
      accessibilityLabel={`${onPress ? "View " : ""}${item.venueName}, Golden Glass location`}
      accessibilityHint={onPress ? "Opens the location page" : undefined}
    >
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <View
            style={styles.goldenGlassBadge}
            accessible
            accessibilityLabel="Golden Glass"
          >
            <MartiniIcon size={20} color={colors.awardGold} filled />
          </View>
          <Text style={styles.venueName} numberOfLines={2}>
            {item.venueName}
          </Text>
          {item.is_location_verified ? <LocationVerifiedBadge compact /> : null}
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textMuted}
            pointerEvents="none"
          />
        </View>
        {location ? (
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        ) : null}
        <View
          style={styles.detailRow}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={
            "Overall " +
            formatRating(item.rawOverall) +
            " from " +
            (reviewCount ?? item.distinctReviewers) +
            " reviews."
          }
        >
          <View style={styles.metricBlock}>
            <Text style={styles.eyebrow}>OVERALL</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.score}>{formatRating(item.rawOverall)}</Text>
              <View style={styles.ratingPips}>
                <RatingPips
                  value={item.rawOverall}
                  size={15}
                  accessibilityLabel=""
                />
              </View>
            </View>
            <Text style={styles.reviewCount} numberOfLines={1}>
              {reviewCount ?? item.distinctReviewers}{" "}
              {(reviewCount ?? item.distinctReviewers) === 1
                ? "review"
                : "reviews"}
            </Text>
          </View>
          {item.regulars.length > 0 ? (
            <View style={styles.regularsColumn}>
              <Text style={styles.eyebrow}>REGULARS</Text>
              <View
                style={styles.regularAvatars}
                accessibilityLabel={item.regulars.length + " regulars"}
              >
                {item.regulars.slice(0, 3).map((regular, index) => (
                  <View
                    key={regular.profile_id}
                    style={[
                      styles.regularAvatar,
                      index > 0 && styles.regularAvatarOverlap,
                    ]}
                  >
                    <MemberAvatar member={regular} size={32} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    overflow: "hidden" as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.awardGold,
    ...t.elevation.card,
  },
  pressed: { opacity: 0.75 },
  cardBody: { padding: t.spacing.lg },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "stretch" as const,
    gap: t.spacing.xs,
  },
  venueName: {
    ...t.typography.title,
    color: t.colors.text,
    flexShrink: 1,
  },
  goldenGlassBadge: {
    alignItems: "center" as const,
    flexShrink: 0,
    justifyContent: "center" as const,
  },
  location: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  regularsColumn: {
    alignItems: "flex-end" as const,
    flexShrink: 0,
    gap: t.spacing.xs,
    paddingTop: 1,
  },
  regularAvatars: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 38,
    alignSelf: "flex-end" as const,
  },
  regularAvatar: {
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
  },
  regularAvatarOverlap: {
    marginLeft: -8,
  },
  detailRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.lg,
    marginTop: t.spacing.md,
  },
  metricBlock: { gap: t.spacing.xs },
  eyebrow: { ...t.typography.eyebrow, color: t.colors.textMuted },
  ratingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  score: {
    ...t.typography.display,
    color: t.isDark ? t.colors.textSecondary : t.colors.secondary,
    fontVariant: ["tabular-nums"] as const,
  },
  ratingPips: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.surfaceSunken,
  },
  reviewCount: { ...t.typography.mono, color: t.colors.textMuted },
}));

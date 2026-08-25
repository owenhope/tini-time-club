import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar, MartiniIcon, RatingPips } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import { formatRating } from "@/utils/ratingUtils";
import { routes } from "@/utils/routes";
import { reportError } from "@/utils/log";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";
import {
  getGoldenGlassRecipients,
  type GoldenGlassRecipient,
} from "@/services/goldenGlassService";

export default function GoldenGlassList({
  enabled,
  regionId,
  regionName,
}: {
  enabled: boolean;
  regionId: number | null;
  regionName: string | null;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const nativeTabBarInset = useNativeTabBarContentInset();
  const [rows, setRows] = useState<GoldenGlassRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || regionId == null) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    void getGoldenGlassRecipients(regionId)
      .then((next) => {
        if (active) setRows(next);
      })
      .catch((error) => {
        reportError("Unable to load Golden Glass:", error);
        if (active) {
          setRows([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, regionId]);

  const renderItem = ({ item }: { item: GoldenGlassRecipient }) => {
    const location = item.neighborhood
      ? item.neighborhood
      : item.address
        ? formatCityRegion(stripNameFromAddress(item.venueName, item.address))
        : null;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => router.push(routes.place(item.locationId))}
        accessibilityRole="link"
        accessibilityLabel={`View ${item.venueName}, Golden Glass location`}
        accessibilityHint="Opens the location page"
      >
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.venueName} numberOfLines={2}>
              {item.venueName}
            </Text>
            <View
              style={styles.goldenGlassBadge}
              accessible
              accessibilityLabel="Golden Glass"
            >
              <MartiniIcon size={16} color={colors.awardGold} filled />
            </View>
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
              item.distinctReviewers +
              " reviews."
            }
          >
            <View style={styles.metricBlock}>
              <Text style={styles.eyebrow}>OVERALL</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.score}>
                  {formatRating(item.rawOverall)}
                </Text>
                <View style={styles.ratingPips}>
                  <RatingPips
                    value={item.rawOverall}
                    size={15}
                    accessibilityLabel=""
                  />
                </View>
              </View>
              <Text style={styles.reviewCount} numberOfLines={1}>
                {item.distinctReviewers}{" "}
                {item.distinctReviewers === 1 ? "review" : "reviews"}
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
                      <Avatar
                        avatarPath={regular.avatar_url}
                        username={regular.username}
                        reviewCount={regular.profile_review_count}
                        size={32}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const intro = (
    <View style={styles.intro}>
      <Text style={styles.introEyebrow}>The Best Martinis in {regionName}</Text>
      <View style={styles.introTitleRow}>
        <Text style={styles.introTitle}>Golden Glass</Text>
        <MartiniIcon size={22} color={colors.awardGold} filled />
      </View>
      <Text style={styles.introBody}>
        Places the club is raising a glass to right now.
      </Text>
    </View>
  );

  if (regionId == null) {
    return (
      <EmptyState message="Choose a region to see its current Golden Glass locations." />
    );
  }

  const emptyState = loading ? (
    <View style={styles.state}>
      <ActivityIndicator color={colors.awardGold} />
    </View>
  ) : failed ? (
    <EmptyState message="Golden Glass is taking a quick pause. Try again shortly." />
  ) : (
    <EmptyState message="No locations qualify for Golden Glass here yet." />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={loading || failed ? [] : rows}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.locationId)}
        ListHeaderComponent={intro}
        ListEmptyComponent={emptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: nativeTabBarInset },
        ]}
      />
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  const styles = useStyles();
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  intro: {
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.sm,
    gap: t.spacing.xs,
  },
  introEyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.awardGold,
  },
  introTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  introTitle: { ...t.typography.display, color: t.colors.text },
  introBody: { ...t.typography.body, color: t.colors.textSecondary },
  list: {
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.sm,
    gap: t.spacing.md,
    paddingBottom: t.spacing.xxxl,
  },
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
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceSunken,
  },
  reviewCount: { ...t.typography.mono, color: t.colors.textMuted },
  state: { padding: t.spacing.xxxl, alignItems: "center" as const },
  stateText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
  },
}));

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { stripNameFromAddress, formatCityRegion } from "@/utils/helpers";
import {
  Avatar,
  MartiniIcon,
  RatingPips,
  VerifiedName,
} from "@/components/shared";
import Regulars from "@/components/Regulars";
import { formatRating } from "@/utils/ratingUtils";
import { makeStyles, useTheme } from "@/theme";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { routes } from "@/utils/routes";
import type { ExploreListView } from "@/components/explore/exploreView";
import type { ExploreLocationState } from "@/components/explore/useExploreLocation";
import {
  useExploreDiscovery,
  type ExploreLocationItem,
} from "@/hooks/useExploreDiscovery";
import {
  ExploreSearchArea,
  ExploreSearchField,
} from "@/components/explore/ExploreSearchField";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";
import GoldenGlassList from "@/components/explore/GoldenGlassList";

/**
 * Distinguishes "still loading" from "genuinely nothing here" — both used to
 * render as an identical blank area.
 */
const ListState = ({
  loading,
  message,
}: {
  loading: boolean;
  message: string;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.listState}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Text style={styles.listStateText}>{message}</Text>
      )}
    </View>
  );
};

interface ExploreListsProps {
  enabled: boolean;
  query: string;
  activeView: ExploreListView;
  onQueryChange: (query: string) => void;
  location: ExploreLocationState;
  requestLocation: () => Promise<void>;
  regionId: number | null;
  regionName: string | null;
}

const DISCOVER_PROFILE_AVATAR_SIZE = 40;

export default function ExploreLists(props: ExploreListsProps) {
  if (props.activeView === "golden-glass") {
    return (
      <GoldenGlassList
        enabled={props.enabled}
        regionId={props.regionId}
        regionName={props.regionName}
      />
    );
  }
  return <ExploreDiscoveryLists {...props} />;
}

function ExploreDiscoveryLists({
  enabled,
  query,
  activeView,
  onQueryChange,
  location,
  requestLocation,
}: ExploreListsProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const activeTab = activeView === "members" ? "profiles" : "locations";
  const router = useRouter();
  const openProfile = useOpenProfile();
  // The native tab bar floats over content, so the lists pad their own tails.
  const tabBarInset = useNativeTabBarContentInset();
  const {
    profiles,
    locations,
    loading,
    nearbyEnabled,
    toggleNearby,
    handleEndReached,
  } = useExploreDiscovery({
    enabled,
    activeView: activeTab,
    query,
    location,
    requestLocation,
  });

  const renderProfile = ({ item }: { item: any }) => {
    const reviewCount = Number(item.review_count) || 0;

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => openProfile(item.username, item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            <Avatar
              avatarPath={item.avatar_url}
              username={item.username}
              size={DISCOVER_PROFILE_AVATAR_SIZE}
              reviewCount={reviewCount}
            />
          </View>
          <View style={styles.textContainer}>
            <VerifiedName
              name={item.username || "Unknown User"}
              isVerified={item.is_verified}
              textStyle={[styles.resultTitle, styles.memberResultTitle]}
            />
            {/* Counts are data: mono, one line, correctly plural. */}
            <Text style={styles.profileStats} numberOfLines={1}>
              {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocation = ({ item }: { item: ExploreLocationItem }) => {
    const reviewCount = item.total_ratings ?? 0;
    const reviewLabel = `${reviewCount} ${
      reviewCount === 1 ? "review" : "reviews"
    }`;
    const hasRating = item.rating != null && reviewCount > 0;

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() =>
          router.navigate(
            routes.place(item.id, {
              name: item.name || "",
              address: item.address || "",
            })
          )
        }
        activeOpacity={0.7}
        accessibilityRole="link"
        accessibilityLabel={`View ${item.name}`}
        accessibilityHint="Opens the location page"
      >
        <View style={styles.cardContent}>
          <View style={styles.textContainer}>
            <View style={styles.resultTitleRow}>
              <Text
                style={[styles.resultTitle, styles.memberResultTitle]}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              {item.is_golden_glass ? (
                <MartiniIcon size={16} color={colors.awardGold} filled />
              ) : null}
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.accent}
                pointerEvents="none"
              />
            </View>
            {item.address ? (
              <Text style={styles.resultSubtitle} numberOfLines={1}>
                {formatCityRegion(
                  stripNameFromAddress(item.name, item.address)
                )}
              </Text>
            ) : null}

            <View style={styles.resultSummaryRow}>
              <View
                style={styles.resultMetricBlock}
                accessible
                accessibilityRole="summary"
                accessibilityLabel={
                  hasRating
                    ? `Overall ${formatRating(item.rating)} from ${reviewLabel}`
                    : "Not yet rated"
                }
              >
                <Text style={styles.resultEyebrow}>OVERALL</Text>
                <View style={styles.resultRatingRow}>
                  <Text style={styles.resultScore}>
                    {hasRating ? formatRating(item.rating) : "--"}
                  </Text>
                  {hasRating ? (
                    <View style={styles.resultPips}>
                      <RatingPips
                        value={item.rating}
                        size={13}
                        accessibilityLabel=""
                      />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.resultReviewCount}>{reviewLabel}</Text>
              </View>

              {item.regulars?.length ? (
                <View style={styles.resultRegulars}>
                  <Text style={styles.resultEyebrow}>REGULARS</Text>
                  <Regulars
                    regulars={item.regulars}
                    variant="compact"
                    compactAvatarSize={24}
                    showLabel={false}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ExploreSearchArea>
        <ExploreSearchField
          value={query}
          onChangeText={onQueryChange}
          placeholder={
            activeTab === "locations" ? "Search places" : "Search members"
          }
          trailing={
            activeTab === "locations" ? (
              <TouchableOpacity
                style={[
                  styles.nearbyButton,
                  nearbyEnabled && styles.nearbyButtonActive,
                ]}
                onPress={toggleNearby}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color={nearbyEnabled ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[
                    styles.nearbyText,
                    nearbyEnabled && styles.nearbyTextActive,
                  ]}
                >
                  Nearby
                </Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      </ExploreSearchArea>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === "profiles" ? (
          <FlatList
            data={profiles}
            renderItem={renderProfile}
            keyExtractor={(item) => `profile-${item.id}`}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: tabBarInset },
            ]}
            ListEmptyComponent={
              <ListState
                loading={loading}
                message={
                  query
                    ? `Nobody here by that name. Try another.`
                    : "The club's quiet. Go find a member."
                }
              />
            }
          />
        ) : (
          <FlatList
            data={locations}
            renderItem={renderLocation}
            keyExtractor={(item) => `location-${item.id}`}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: tabBarInset },
            ]}
            ListEmptyComponent={
              <ListState
                loading={loading}
                message={
                  query
                    ? `No places matching "${query}".`
                    : nearbyEnabled
                      ? "Nothing poured near you yet. Widen the net \u2014 turn off Nearby."
                      : "No bars on the board yet. Be the first to log one."
                }
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  nearbyButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 6,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceSunken,
    marginRight: t.spacing.sm,
  },
  nearbyButtonActive: {
    backgroundColor: t.colors.accentSubtle,
  },
  nearbyText: {
    ...t.typography.label,
    letterSpacing: 0,
    color: t.colors.textMuted,
    marginLeft: t.spacing.xs,
  },
  nearbyTextActive: {
    color: t.colors.accent,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: t.spacing.gutter,
    backgroundColor: t.colors.background,
  },
  listState: {
    paddingTop: t.spacing.xxxl,
    paddingHorizontal: t.spacing.xxl,
    alignItems: "center" as const,
  },
  listStateText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
  },
  listContainer: {
    paddingVertical: t.spacing.lg,
  },
  resultCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    marginBottom: t.spacing.md,
    ...t.elevation.card,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  cardContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: t.spacing.lg,
  },
  avatarContainer: {
    marginRight: t.spacing.md,
  },
  resultSummaryRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
    marginTop: t.spacing.md,
  },
  resultMetricBlock: {
    gap: t.spacing.xs,
  },
  resultRatingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  resultPips: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceSunken,
  },
  resultScore: {
    ...t.typography.title,
    color: t.isDark ? t.colors.textSecondary : t.colors.secondary,
    fontVariant: ["tabular-nums"] as const,
  },
  resultReviewCount: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  textContainer: {
    flex: 1,
  },
  resultRegulars: {
    alignItems: "flex-end" as const,
    flexShrink: 0,
    gap: t.spacing.xs,
    paddingTop: 1,
  },
  resultEyebrow: {
    ...t.typography.label,
    color: t.colors.textMuted,
  },
  resultTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
    marginBottom: 2,
  },
  resultTitle: {
    ...t.typography.heading,
    color: t.colors.text,
    flexShrink: 1,
  },
  memberResultTitle: {
    color: t.colors.usernameText,
  },
  resultSubtitle: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  profileStats: {
    ...t.typography.mono,
    color: t.colors.textMuted,
  },
}));

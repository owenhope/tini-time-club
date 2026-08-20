import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { stripNameFromAddress, formatCityRegion } from "@/utils/helpers";
import { Avatar, RatingPips, VerifiedName } from "@/components/shared";
import Regulars from "@/components/Regulars";
import { withRegulars } from "@/services/regularsService";
import { formatRating } from "@/utils/ratingUtils";
import { makeStyles, useTheme } from "@/theme";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import type { ExploreListView } from "@/components/explore/exploreView";
import type { ExploreLocationState } from "@/components/explore/useExploreLocation";
import {
  ExploreSearchArea,
  ExploreSearchField,
} from "@/components/explore/ExploreSearchField";
import { useProfile } from "@/context/profile-context";
import { publicContentService } from "@/services/public-content-service";

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
}

const DISCOVER_PROFILE_AVATAR_SIZE = 40;

export default function ExploreLists({
  enabled,
  query,
  activeView,
  onQueryChange,
  location,
  requestLocation,
}: ExploreListsProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const activeTab = activeView === "members" ? "profiles" : "locations";
  const [profiles, setProfiles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nearby, setNearby] = useState(true); // Default enabled
  const nearbyEnabled =
    nearby && location.status !== "denied" && location.status !== "unavailable";
  const userLocation =
    location.status === "ready"
      ? location.coordinates
      : location.status === "idle" || location.status === "loading"
        ? undefined
        : null;
  const router = useRouter();
  const openProfile = useOpenProfile();

  useEffect(() => {
    if (!enabled || activeView !== "places" || !nearbyEnabled) return;

    if (location.status === "idle") {
      void requestLocation();
    }
  }, [activeView, enabled, location.status, nearbyEnabled, requestLocation]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const fetchProfiles = React.useCallback(
    async (searchQuery: string) => {
      setLoading(true);
      try {
        // Ranked and filtered in SQL. This previously downloaded every profile,
        // every published review and every follower row to count them locally.
        if (!profile) {
          setProfiles(await publicContentService.getProfiles(searchQuery, 50));
          return;
        }

        const { data, error } = await supabase.rpc("top_profiles", {
          p_limit: 50,
          p_search: searchQuery || null,
        });

        if (error) {
          reportError("Error fetching profiles:", error);
          setProfiles([]);
          return;
        }

        setProfiles(data ?? []);
      } catch (error) {
        reportError("Error fetching profiles:", error);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    },
    [profile]
  );

  const fetchLocations = React.useCallback(
    async (searchQuery: string) => {
      setLoading(true);
      try {
        if (!searchQuery) {
          if (!profile) {
            const data = await publicContentService.getLocations(undefined, 50);
            let processedLocations = data.map((location) => ({
              id: location.id,
              name: location.name,
              address: location.address,
              latitude: location.lat,
              longitude: location.lon,
              rating: location.rating,
              taste_avg: location.taste_avg,
              presentation_avg: location.presentation_avg,
              total_ratings: location.total_ratings,
            }));

            if (nearbyEnabled && userLocation) {
              processedLocations = processedLocations.filter((location) =>
                location.latitude && location.longitude
                  ? calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      location.latitude,
                      location.longitude
                    ) <= 50
                  : false
              );
            }

            const visibleLocations = processedLocations
              .filter((location) => (location.total_ratings || 0) >= 2)
              .sort((a, b) => {
                const ratingDiff = (b.rating || 0) - (a.rating || 0);
                return ratingDiff !== 0
                  ? ratingDiff
                  : (b.total_ratings || 0) - (a.total_ratings || 0);
              })
              .slice(0, 20);
            setLocations(await withRegulars(visibleLocations));
            return;
          }

          // Use the location_ratings view which already includes coordinates
          const { data, error } = await supabase
            .from("location_ratings")
            .select("*")
            .order("total_ratings", { ascending: false })
            .limit(50);

          if (error) {
            reportError("Error fetching location ratings:", error);
            setLocations([]);
            return;
          }

          // Process the data to calculate averages and format for display
          let processedLocations =
            data?.map((location: any) => {
              const totalRatings = location.total_ratings || 0;

              // Use pre-extracted coordinates from the view
              const latitude = location.lat;
              const longitude = location.lon;

              return {
                id: location.id,
                name: location.name,
                address: location.address,
                latitude,
                longitude,
                rating: location.rating,
                taste_avg: location.taste_avg,
                presentation_avg: location.presentation_avg,
                total_ratings: totalRatings,
              };
            }) || [];

          // Filter by distance if nearby is enabled and we have user location
          if (nearbyEnabled && userLocation) {
            // Temporary: show all locations with coordinates for debugging
            const locationsWithCoords = processedLocations.filter(
              (location) => {
                if (!location.latitude || !location.longitude) {
                  return false;
                }
                return true;
              }
            );

            // If we have locations with coordinates, apply distance filtering
            if (locationsWithCoords.length > 0) {
              processedLocations = locationsWithCoords.filter((location) => {
                const distance = calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  location.latitude,
                  location.longitude
                );
                return distance <= 50; // 50km radius for Vancouver area
              });
            } else {
              // If no locations have coordinates, show all locations
              processedLocations = processedLocations;
            }
          }

          // Filter out locations with less than 2 reviews or null ratings (minimum sample size)
          // Sort by rating first, then by review count as tiebreaker
          const sortedLocations = processedLocations
            .filter(
              (loc) => loc.rating !== null && (loc.total_ratings || 0) >= 2
            )
            .sort((a, b) => {
              // First sort by rating (highest first)
              const ratingDiff = (b.rating || 0) - (a.rating || 0);
              if (ratingDiff !== 0) return ratingDiff;

              // If ratings are equal, sort by review count (highest first) - more reviews = more reliable
              return (b.total_ratings || 0) - (a.total_ratings || 0);
            })
            .slice(0, 20);

          setLocations(await withRegulars(sortedLocations));
        } else {
          if (!profile) {
            const data = await publicContentService.getLocations(
              searchQuery,
              20
            );
            setLocations(
              await withRegulars(
                data.map((location) => ({
                  id: location.id,
                  name: location.name,
                  address: location.address,
                  latitude: location.lat,
                  longitude: location.lon,
                  rating: location.total_ratings > 0 ? location.rating : null,
                  taste_avg:
                    location.total_ratings > 0 ? location.taste_avg : null,
                  presentation_avg:
                    location.total_ratings > 0
                      ? location.presentation_avg
                      : null,
                  total_ratings: location.total_ratings,
                }))
              )
            );
            return;
          }

          // Server-side fuzzy search: matches name or address, tolerates
          // typos via trigram similarity, and ranks name hits first.
          const { data: locationsData, error: locationsError } =
            await supabase.rpc("search_locations", {
              p_query: searchQuery,
              p_limit: 20,
            });

          if (locationsError) {
            reportError("Error fetching locations:", locationsError);
            setLocations([]);
            return;
          }

          const processedLocations = ((locationsData ?? []) as any[]).map(
            (location: any) => {
              const totalRatings = location.total_ratings || 0;
              return {
                id: location.id,
                name: location.name,
                address: location.address,
                latitude: location.lat,
                longitude: location.lon,
                // The view reports 0 averages for review-less locations; the
                // UI treats null as "not yet rated".
                rating: totalRatings > 0 ? location.rating : null,
                taste_avg: totalRatings > 0 ? location.taste_avg : null,
                presentation_avg:
                  totalRatings > 0 ? location.presentation_avg : null,
                total_ratings: totalRatings,
              };
            }
          );

          setLocations(await withRegulars(processedLocations));
        }
      } catch (error) {
        reportError("Error fetching locations:", error);
      } finally {
        setLoading(false);
      }
    },
    [nearbyEnabled, profile, userLocation]
  );

  React.useEffect(() => {
    if (!enabled) return;

    // Debounce: without this every keystroke fires its own Supabase request.
    const handle = setTimeout(
      () => {
        if (activeTab === "profiles") {
          fetchProfiles(query);
        } else {
          // For locations tab, if nearby is enabled and we don't have user location yet, wait
          // But if userLocation is explicitly null (permission denied), proceed anyway
          if (nearbyEnabled && userLocation === undefined) {
            return; // Don't fetch until we have location or permission is denied
          }
          fetchLocations(query);
        }
      },
      query ? 300 : 0
    );

    return () => clearTimeout(handle);
  }, [
    activeTab,
    enabled,
    fetchLocations,
    fetchProfiles,
    query,
    nearbyEnabled,
    userLocation,
  ]);

  const renderProfile = ({ item }: { item: any }) => {
    const reviewCount = item.review_count || 0;

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

  const renderLocation = ({ item }: { item: any }) => {
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
            activeTab === "locations" ? "Search top places" : "Search members"
          }
          trailing={
            activeTab === "locations" ? (
              <TouchableOpacity
                style={[
                  styles.nearbyButton,
                  nearbyEnabled && styles.nearbyButtonActive,
                ]}
                onPress={() => setNearby(!nearby)}
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
            contentContainerStyle={styles.listContainer}
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
            contentContainerStyle={styles.listContainer}
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

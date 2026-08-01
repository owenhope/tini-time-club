import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { stripNameFromAddress, formatCityRegion } from "@/utils/helpers";
import { Avatar, RatingSummary, VerifiedName } from "@/components/shared";
import Regulars from "@/components/Regulars";
import { getRegularsByLocation } from "@/services/regularsService";
import * as Location from "expo-location";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";

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

interface DiscoverTabsProps {
  query: string;
  activeTab: "profiles" | "locations";
  onTabChange: (tab: "profiles" | "locations") => void;
  onQueryChange: (query: string) => void;
}

export default function DiscoverTabs({
  query,
  activeTab,
  onTabChange,
  onQueryChange,
}: DiscoverTabsProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nearby, setNearby] = useState(true); // Default enabled
  const [userLocation, setUserLocation] = useState<
    | {
        latitude: number;
        longitude: number;
      }
    | null
    | undefined
  >(undefined); // undefined = not attempted, null = denied/failed, object = success
  const router = useRouter();

  // Get user location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // If permission denied, set a flag to indicate we should show all locations
        setUserLocation(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(userCoords);
    } catch (error) {
      reportError("Error getting location:", error);
      // On error, set to null so we can still show locations without nearby filtering
      setUserLocation(null);
    }
  };

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

  const fetchProfiles = async (searchQuery: string) => {
    setLoading(true);
    try {
      // Ranked and filtered in SQL. This previously downloaded every profile,
      // every published review and every follower row to count them locally.
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
  };

  const fetchLocations = async (searchQuery: string) => {
    setLoading(true);
    try {
      if (!searchQuery) {
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
        if (nearby && userLocation) {
          // Temporary: show all locations with coordinates for debugging
          const locationsWithCoords = processedLocations.filter((location) => {
            if (!location.latitude || !location.longitude) {
              return false;
            }
            return true;
          });

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
          .filter((loc) => loc.rating !== null && (loc.total_ratings || 0) >= 2)
          .sort((a, b) => {
            // First sort by rating (highest first)
            const ratingDiff = (b.rating || 0) - (a.rating || 0);
            if (ratingDiff !== 0) return ratingDiff;

            // If ratings are equal, sort by review count (highest first) - more reviews = more reliable
            return (b.total_ratings || 0) - (a.total_ratings || 0);
          })
          .slice(0, 20);

        const regularsByLocation = await getRegularsByLocation(
          sortedLocations.map((location) => location.id)
        );
        setLocations(
          sortedLocations.map((location) => ({
            ...location,
            regulars: regularsByLocation.get(String(location.id)) ?? [],
          }))
        );
      } else {
        // Server-side fuzzy search: matches name or address, tolerates
        // typos via trigram similarity, and ranks name hits first.
        const { data: locationsData, error: locationsError } = await supabase.rpc(
          "search_locations",
          { p_query: searchQuery, p_limit: 20 }
        );

        if (locationsError) {
          reportError("Error fetching locations:", locationsError);
          setLocations([]);
          return;
        }

        const processedLocations =
          locationsData?.map((location: any) => {
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
          }) || [];

        const regularsByLocation = await getRegularsByLocation(
          processedLocations.map((location) => location.id)
        );
        setLocations(
          processedLocations.map((location) => ({
            ...location,
            regulars: regularsByLocation.get(String(location.id)) ?? [],
          }))
        );
      }
    } catch (error) {
      reportError("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Debounce: without this every keystroke fires its own Supabase request.
    const handle = setTimeout(
      () => {
        if (activeTab === "profiles") {
          fetchProfiles(query);
        } else {
          // For locations tab, if nearby is enabled and we don't have user location yet, wait
          // But if userLocation is explicitly null (permission denied), proceed anyway
          if (nearby && userLocation === undefined) {
            return; // Don't fetch until we have location or permission is denied
          }
          fetchLocations(query);
        }
      },
      query ? 300 : 0
    );

    return () => clearTimeout(handle);
  }, [activeTab, query, nearby, userLocation]);

  const renderProfile = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => router.navigate(routes.user(item.username))}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            <Avatar
              avatarPath={item.avatar_url}
              username={item.username}
              size={40}
              reviewCount={item.review_count}
            />
          </View>
          <View style={styles.textContainer}>
            <VerifiedName
              name={item.username || "Unknown User"}
              isVerified={item.is_verified}
              textStyle={styles.resultTitle}
            />
            <Text style={styles.profileStats}>
              {item.review_count || 0} reviews • {item.follower_count || 0}{" "}
              followers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocation = ({ item }: { item: any }) => (
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
    >
      <View style={styles.cardContent}>
        <View style={styles.textContainer}>
          <Text style={styles.resultTitle}>{item.name}</Text>
          {item.address && (
            <Text style={styles.resultSubtitle}>
              {formatCityRegion(stripNameFromAddress(item.name, item.address))}
            </Text>
          )}
          <Regulars regulars={item.regulars} variant="compact" />
        </View>
        <View style={styles.resultRating}>
          <RatingSummary
            variant="compact"
            overall={item.rating}
            reviewCount={item.total_ratings ?? 0}
            compactDecorated={false}
            compactLayout="stacked"
            compactOverallSize="title"
            compactMetaSize="subtitle"
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tab Headers */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "locations" && styles.activeTabLocations,
          ]}
          onPress={() => onTabChange("locations")}
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={activeTab === "locations" ? colors.accent : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "locations" && styles.activeTabTextLocations,
            ]}
          >
            Places
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "profiles" && styles.activeTabProfiles,
          ]}
          onPress={() => onTabChange("profiles")}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={
              activeTab === "profiles" ? colors.secondary : colors.textMuted
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "profiles" && styles.activeTabTextProfiles,
            ]}
          >
            Profiles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === "locations"
              ? "Search for places"
              : "Search for people"
          }
          value={query}
          onChangeText={onQueryChange}
          placeholderTextColor={colors.textMuted}
        />
        {activeTab === "locations" && (
          <TouchableOpacity
            style={[styles.nearbyButton, nearby && styles.nearbyButtonActive]}
            onPress={() => setNearby(!nearby)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="location"
              size={16}
              color={nearby ? colors.accent : colors.textMuted}
            />
            <Text
              style={[styles.nearbyText, nearby && styles.nearbyTextActive]}
            >
              Nearby
            </Text>
          </TouchableOpacity>
        )}
        {query !== "" && (
          <TouchableOpacity
            onPress={() => onQueryChange("")}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

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
                    ? `No people matching "${query}".`
                    : "No profiles to show yet."
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
                    : nearby
                      ? "No places near you yet. Try turning off Nearby."
                      : "No places to show yet."
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
  },
  tabContainer: {
    flexDirection: "row" as const,
    backgroundColor: t.colors.surface,
    marginHorizontal: t.spacing.xl - 4,
    marginTop: t.spacing.xl - 4,
    marginBottom: t.spacing.sm,
    borderRadius: t.radius.md,
    ...t.elevation.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.sm,
  },
  activeTabProfiles: {
    backgroundColor: t.colors.secondarySubtle,
  },
  activeTabLocations: {
    backgroundColor: t.colors.accentSubtle,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: t.colors.textMuted,
    marginLeft: t.spacing.sm,
  },
  activeTabTextProfiles: {
    color: t.colors.secondary,
  },
  activeTabTextLocations: {
    color: t.colors.accent,
  },
  searchBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: t.colors.surface,
    marginHorizontal: t.spacing.xl - 4,
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    borderRadius: 25,
    height: 48,
    ...t.elevation.card,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: t.spacing.md,
    color: t.colors.text,
  },
  nearbyButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 6,
    borderRadius: t.radius.lg,
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
    paddingHorizontal: t.spacing.xl - 4,
  },
  listState: {
    paddingTop: t.spacing.xxxl,
    paddingHorizontal: t.spacing.xxl,
    alignItems: "center" as const,
  },
  listStateText: {
    color: t.colors.textSecondary,
    fontSize: 15,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  listContainer: {
    paddingVertical: t.spacing.lg,
  },
  resultCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    marginBottom: t.spacing.sm,
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
  resultRating: {
    alignItems: "flex-end" as const,
    alignSelf: "flex-start" as const,
    marginLeft: t.spacing.md,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  resultTitle: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    marginBottom: 2,
  },
  resultSubtitle: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  profileStats: {
    fontSize: 13,
    color: t.colors.textSecondary,
    fontWeight: "400" as const,
  },
}));

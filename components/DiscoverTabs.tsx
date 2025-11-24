import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { stripNameFromAddress } from "@/utils/helpers";
import imageCache from "@/utils/imageCache";
import { Avatar } from "@/components/shared";
import { getLocationRatingDisplay } from "@/utils/ratingUtils";
import * as Location from "expo-location";

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
      console.error("Error getting location:", error);
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
      if (!searchQuery) {
        const { data } = await supabase.rpc("top_profiles");
        setProfiles(data || []);
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${searchQuery}%`)
          .limit(20);
        setProfiles(data || []);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
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
          console.error("Error fetching location ratings:", error);
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

        setLocations(sortedLocations);
      } else {
        const { data } = await supabase
          .from("locations")
          .select("id, name, address")
          .ilike("name", `%${searchQuery}%`)
          .limit(20);
        setLocations(data || []);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
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
  }, [activeTab, query, nearby, userLocation]);

  const renderProfile = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => router.navigate(`/discover/users/${item.username}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            <Avatar
              avatarPath={item.avatar_url}
              username={item.username}
              size={50}
              style={styles.avatar}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.resultTitle}>
              {item.username || "Unknown User"}
            </Text>
            <Text style={styles.profileStats}>
              {item.review_count || 0} reviews • {item.follower_count || 0}{" "}
              followers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocation = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => router.navigate(`/discover/locations/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.ratingSection}>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>
              {getLocationRatingDisplay(item)}
            </Text>
          </View>
          <Text style={styles.reviewCountText}>
            {item.total_ratings || 0} reviews
          </Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.resultTitle}>{item.name}</Text>
          {item.address && (
            <Text style={styles.resultSubtitle}>
              {stripNameFromAddress(item.name, item.address)}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
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
            color={activeTab === "locations" ? "#8B5CF6" : "#8E8E93"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "locations" && styles.activeTabTextLocations,
            ]}
          >
            Locations
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
            color={activeTab === "profiles" ? "#336654" : "#8E8E93"}
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
        <Ionicons name="search-outline" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === "locations"
              ? "Search for places"
              : "Search for people"
          }
          value={query}
          onChangeText={onQueryChange}
          placeholderTextColor="#9ca3af"
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
              color={nearby ? "#8B5CF6" : "#9CA3AF"}
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
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
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
          />
        ) : (
          <FlatList
            data={locations}
            renderItem={renderLocation}
            keyExtractor={(item) => `location-${item.id}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTabProfiles: {
    backgroundColor: "#E8F5E8",
  },
  activeTabLocations: {
    backgroundColor: "#F3F0FF",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
    marginLeft: 8,
  },
  activeTabTextProfiles: {
    color: "#336654",
  },
  activeTabTextLocations: {
    color: "#8B5CF6",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    height: 48,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: "#1a1a1a",
  },
  nearbyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
  },
  nearbyButtonActive: {
    backgroundColor: "#F3F0FF",
  },
  nearbyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginLeft: 4,
  },
  nearbyTextActive: {
    color: "#8B5CF6",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingVertical: 16,
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  ratingSection: {
    alignItems: "center",
    marginRight: 12,
  },
  ratingContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#B6A3E2",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  profileStats: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "400",
  },
  ratingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  reviewCountText: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "400",
    marginTop: 4,
    textAlign: "center",
  },
});

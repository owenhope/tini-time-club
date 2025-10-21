import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { stripNameFromAddress } from "@/utils/helpers";
import imageCache from "@/utils/imageCache";
import { Avatar } from "@/components/shared";
import { getLocationRatingDisplay } from "@/utils/ratingUtils";

interface DiscoverTabsProps {
  query: string;
}

export default function DiscoverTabs({ query }: DiscoverTabsProps) {
  const [activeTab, setActiveTab] = useState<"profiles" | "locations">(
    "profiles"
  );
  const [profiles, setProfiles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        // Use direct query instead of RPC to properly filter deleted reviews
        const { data, error } = await supabase
          .from("locations")
          .select(
            `
            id,
            name,
            address,
            reviews!reviews_location_fkey(
              taste,
              presentation,
              state
            )
          `
          )
          .eq("reviews.state", 1) // Only include active reviews
          .limit(20);

        if (error) {
          console.error("Error fetching top locations:", error);
          setLocations([]);
          return;
        }

        // Process the data to calculate averages and format for display
        const processedLocations =
          data?.map((location: any) => {
            const activeReviews = location.reviews.filter(
              (review: any) => review.state === 1
            );
            const totalRatings = activeReviews.length;

            if (totalRatings === 0) {
              return {
                id: location.id,
                name: location.name,
                address: location.address,
                rating: null,
                taste_avg: null,
                presentation_avg: null,
                total_ratings: 0,
              };
            }

            const tasteSum = activeReviews.reduce(
              (sum: number, review: any) => sum + (review.taste || 0),
              0
            );
            const presentationSum = activeReviews.reduce(
              (sum: number, review: any) => sum + (review.presentation || 0),
              0
            );

            const taste_avg = tasteSum / totalRatings;
            const presentation_avg = presentationSum / totalRatings;
            const rating = (taste_avg + presentation_avg) / 2;

            return {
              id: location.id,
              name: location.name,
              address: location.address,
              rating,
              taste_avg,
              presentation_avg,
              total_ratings: totalRatings,
            };
          }) || [];

        // Sort by rating and take top 20
        const sortedLocations = processedLocations
          .filter((loc) => loc.rating !== null)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
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
      fetchLocations(query);
    }
  }, [activeTab, query]);

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
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingText}>
            {getLocationRatingDisplay(item)}
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
            activeTab === "profiles" && styles.activeTabProfiles,
          ]}
          onPress={() => setActiveTab("profiles")}
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

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "locations" && styles.activeTabLocations,
          ]}
          onPress={() => setActiveTab("locations")}
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
    marginTop: 10,
    borderRadius: 12,
    padding: 4,
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
  ratingContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#B6A3E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
  ratingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});

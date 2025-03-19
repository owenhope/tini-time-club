import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useNavigation } from "expo-router";
import ReviewItem from "@/components/ReviewItem";
import { Ionicons } from "@expo/vector-icons";
import { Review } from "@/types/types";

interface LocationType {
  id: string;
  name: string;
}

const LocationProfile = () => {
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [locationReviews, setLocationReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingImage, setLoadingImage] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    null
  );

  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const locationParam = params.location as string | undefined; // expects ?location=LocationName

  const displayLocation = selectedLocation;

  // Update header with custom title
  useEffect(() => {
    if (displayLocation) {
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{displayLocation.name}</Text>
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButtonLeft}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        ),
        // Removed headerRight since following is not applicable for locations
      });
    }
  }, [displayLocation, navigation]);

  // Fetch the selected location when locationParam is provided
  useEffect(() => {
    setLocationImage(null);
    if (locationParam) {
      fetchSelectedLocation(locationParam);
    }
  }, [locationParam]);

  const fetchSelectedLocation = async (locationName: string) => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("name", locationName)
        .single();
      if (error) {
        console.error("Error fetching selected location:", error);
      } else {
        setSelectedLocation(data);
      }
    } catch (err) {
      console.error("Unexpected error fetching location:", err);
    }
  };

  const loadLocationImage = async (locationId?: string) => {
    setLoadingImage(true);
    if (!locationId) {
      setLoadingImage(false);
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("location_images")
        .download(`${locationId}/image.jpg`);
      if (error) {
        console.log(error);
        if (
          error.message.includes("400") ||
          error.message.includes("The resource was not found")
        ) {
          setLocationImage(null);
          setLoadingImage(false);
          return;
        }
        console.error("Location image download error:", error);
        setLoadingImage(false);
        return;
      }
      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        fr.onload = () => {
          setLocationImage(fr.result as string);
          setLoadingImage(false);
        };
      }
    } catch (err) {
      console.error("Unexpected error while downloading location image:", err);
      setLoadingImage(false);
    }
  };

  const loadLocationReviews = async (locationId?: string) => {
    setLoadingReviews(true);
    if (!locationId) {
      setLoadingReviews(false);
      return;
    }
    try {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          comment,
          image_url,
          inserted_at,
          taste,
          presentation,
          location:locations!reviews_location_fkey(name),
          spirit:spirit(name),
          type:type(name),
          profile:profiles!reviews_user_id_fkey1(username)
          `
        )
        .eq("location_id", locationId)
        .eq("state", 1)
        .order("inserted_at", { ascending: false });
      if (error) {
        console.error("Error fetching location reviews:", error);
        setLoadingReviews(false);
        return;
      }

      const reviewsWithFullUrl = await Promise.all(
        reviewsData.map(async (review: any) => {
          const { data, error } = await supabase.storage
            .from("review_images")
            .createSignedUrl(review.image_url, 60);
          if (error) {
            console.error("Error creating signed URL:", error);
            return review;
          }
          return { ...review, image_url: data.signedUrl };
        })
      );
      setLocationReviews(reviewsWithFullUrl);
      setLoadingReviews(false);
    } catch (err) {
      console.error("Unexpected error while fetching location reviews:", err);
      setLoadingReviews(false);
    }
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <ReviewItem
      review={item}
      aspectRatio={1}
      canDelete={false}
      onDelete={undefined}
    />
  );

  const renderEmpty = () => {
    if (locationReviews.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reviews available.</Text>
        </View>
      );
    }
    return null;
  };

  useEffect(() => {
    if (displayLocation && displayLocation.id) {
      loadLocationImage(displayLocation.id);
      loadLocationReviews(displayLocation.id);
    }
  }, [displayLocation]);

  return (
    <View style={styles.container}>
      {/* Location Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {locationImage ? (
            <Image style={styles.avatar} source={{ uri: locationImage }} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {displayLocation?.name
                  ? displayLocation.name.charAt(0).toUpperCase()
                  : "?"}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfoContainer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{locationReviews.length}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            {/* You can optionally add more stat items if your location data includes extra metrics */}
          </View>
        </View>
      </View>
      {/* Reviews List */}
      <View style={styles.reviewsContainer}>
        <FlatList
          data={locationReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          onRefresh={() => {
            if (displayLocation && displayLocation.id) {
              loadLocationReviews(displayLocation.id);
            }
          }}
          refreshing={loadingReviews}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
    alignItems: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ccc",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "bold",
  },
  userInfoContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
    marginRight: 16,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    color: "#777",
  },
  reviewsContainer: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
  },
  headerButtonLeft: {
    marginLeft: 5,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default LocationProfile;

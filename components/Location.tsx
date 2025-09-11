import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useNavigation } from "expo-router";
import ReviewItem from "@/components/ReviewItem";
import CommentsSlider from "@/components/CommentsSlider";
import { Ionicons } from "@expo/vector-icons";
import { Review } from "@/types/types";
import { stripNameFromAddress } from "@/utils/helpers";

// Constants
const COLORS = {
  primary: "#2E86AB",
  taste: "olive",
  presentation: "silver",
  white: "#fff",
  gray: "#ccc",
  text: "#555",
} as const;

const DIMENSIONS = {
  avatar: 100,
  ratingCircle: 50,
} as const;

interface LocationType {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lon?: number;
  rating?: number; // overall rating
  taste_avg?: number;
  presentation_avg?: number;
  total_ratings?: number;
}

const Location = () => {
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [locationReviews, setLocationReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingImage, setLoadingImage] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    null
  );
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);

  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const locationIdParam = params.location as string | undefined;

  const displayLocation = selectedLocation;

  // Update header with custom title and back button
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
      });
    }
  }, [displayLocation, navigation]);

  // Fetch the selected location from the "location_ratings" view
  useEffect(() => {
    setLocationImage(null);
    if (locationIdParam) {
      fetchSelectedLocation(locationIdParam);
    }
  }, [locationIdParam]);

  const fetchSelectedLocation = useCallback(async (locationId: string) => {
    try {
      const { data, error } = await supabase
        .from("location_ratings")
        .select("*")
        .eq("id", locationId)
        .single();
      if (error) {
        console.error("Error fetching selected location:", error);
      } else {
        setSelectedLocation(data);
      }
    } catch (err) {
      console.error("Unexpected error fetching location:", err);
    }
  }, []);

  const loadLocationImage = useCallback(async (locationId?: string) => {
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
  }, []);

  const loadLocationReviews = useCallback(async (locationId?: string) => {
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
          profile:profiles!reviews_user_id_fkey1(id, username, avatar_url)
          `
        )
        .eq("location", locationId)
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
  }, []);

  const handleShowComments = useCallback(
    (reviewId: string, onCommentAdded: any, onCommentDeleted: any) => {
      const review = locationReviews.find((r) => r.id === reviewId);
      if (review) {
        setSelectedCommentReview(review);
      }
    },
    [locationReviews]
  );

  const handleCommentAdded = useCallback(
    (reviewId: string, newComment: any) => {
      setLocationReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId
            ? { ...review, _commentPatch: { action: "add", data: newComment } }
            : review
        )
      );
    },
    []
  );

  const handleCommentDeleted = useCallback(
    (reviewId: string, commentId: number) => {
      setLocationReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId
            ? { ...review, _commentPatch: { action: "delete", id: commentId } }
            : review
        )
      );
    },
    []
  );

  const renderReviewItem = useCallback(
    ({ item }: { item: Review }) => (
      <ReviewItem
        review={item}
        canDelete={false}
        onDelete={undefined}
        onShowLikes={() => {}}
        onShowComments={handleShowComments}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
      />
    ),
    [handleShowComments, handleCommentAdded, handleCommentDeleted]
  );

  const renderEmpty = useCallback(() => {
    if (loadingReviews) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Loading reviews...</Text>
        </View>
      );
    }
    if (locationReviews.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reviews available.</Text>
        </View>
      );
    }
    return null;
  }, [loadingReviews, locationReviews.length]);

  const onRefresh = useCallback(() => {
    if (displayLocation?.id) {
      loadLocationReviews(displayLocation.id);
    }
  }, [displayLocation?.id]);

  useEffect(() => {
    if (displayLocation && displayLocation.id) {
      loadLocationImage(displayLocation.id);
      loadLocationReviews(displayLocation.id);
    }
  }, [displayLocation?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={{ flexDirection: "row" }}>
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
            <Text style={styles.reviewCount}>
              {displayLocation?.total_ratings ?? 0} Reviews
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.ratingsHeaderContainer}>
              <View style={styles.ratingContainer}>
                <View style={styles.ratingCircle}>
                  <Text style={styles.circleText}>
                    {displayLocation?.rating
                      ? displayLocation.rating.toFixed(1)
                      : "N/A"}
                  </Text>
                </View>
                <Text style={styles.circleLabel}>Overall</Text>
              </View>
              <View style={styles.ratingContainer}>
                <View style={styles.tasteCircle}>
                  <Text style={styles.circleText}>
                    {displayLocation?.taste_avg
                      ? displayLocation.taste_avg.toFixed(1)
                      : "N/A"}
                  </Text>
                </View>
                <Text style={styles.circleLabel}>Taste</Text>
              </View>
              <View style={styles.ratingContainer}>
                <View style={styles.presentationCircle}>
                  <Text style={styles.circleText}>
                    {displayLocation?.presentation_avg
                      ? displayLocation.presentation_avg.toFixed(1)
                      : "N/A"}
                  </Text>
                </View>
                <Text style={styles.circleLabel}>Presentation</Text>
              </View>
            </View>
            <View>
              <Text>
                {stripNameFromAddress(
                  displayLocation?.name ?? "",
                  displayLocation?.address ?? ""
                )}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.reviewsContainer}>
        <FlatList
          data={locationReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={loadingReviews}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      </View>

      {selectedCommentReview && (
        <CommentsSlider
          review={selectedCommentReview}
          onClose={() => setSelectedCommentReview(null)}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    padding: 16,
  },
  avatarContainer: {
    marginRight: 16,
    alignItems: "center",
  },
  avatar: {
    width: DIMENSIONS.avatar,
    height: DIMENSIONS.avatar,
    borderRadius: DIMENSIONS.avatar / 2,
    backgroundColor: COLORS.gray,
  },
  avatarPlaceholder: {
    width: DIMENSIONS.avatar,
    height: DIMENSIONS.avatar,
    borderRadius: DIMENSIONS.avatar / 2,
    backgroundColor: COLORS.gray,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 40,
    color: COLORS.white,
    fontWeight: "bold",
  },
  ratingsHeaderContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  ratingContainer: {
    alignItems: "center",
  },
  ratingCircle: {
    width: DIMENSIONS.ratingCircle,
    height: DIMENSIONS.ratingCircle,
    borderRadius: DIMENSIONS.ratingCircle / 2,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  tasteCircle: {
    width: DIMENSIONS.ratingCircle,
    height: DIMENSIONS.ratingCircle,
    borderRadius: DIMENSIONS.ratingCircle / 2,
    backgroundColor: COLORS.taste,
    justifyContent: "center",
    alignItems: "center",
  },
  presentationCircle: {
    width: DIMENSIONS.ratingCircle,
    height: DIMENSIONS.ratingCircle,
    borderRadius: DIMENSIONS.ratingCircle / 2,
    backgroundColor: COLORS.presentation,
    justifyContent: "center",
    alignItems: "center",
  },
  circleText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  circleLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  reviewCount: {
    fontSize: 16,
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
    color: COLORS.text,
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

export default Location;

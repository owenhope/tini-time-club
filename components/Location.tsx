import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import { getBlockedUserIds } from "@/utils/blockUtils";
import { useProfile } from "@/context/profile-context";

// Constants
const COLORS = {
  primary: "#B6A3E2",
  taste: "#9E9E9E",
  presentation: "#9E9E9E",
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
  const { profile } = useProfile();
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [locationReviews, setLocationReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingImage, setLoadingImage] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    null
  );
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const loadedLocationIdRef = useRef<string | null>(null);

  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const locationIdParam = params.location as string | undefined;

  const displayLocation = useMemo(() => selectedLocation, [selectedLocation]);

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
      loadedLocationIdRef.current = null; // Reset to allow reload

      // Load location reviews inline
      const loadReviews = async () => {
        setLoadingReviews(true);
        try {
          // Get blocked user IDs to filter out their reviews
          const blockedIds = profile ? await getBlockedUserIds(profile.id) : [];

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
            user_id,
            profile:profiles!reviews_user_id_fkey1(id, username, avatar_url)
            `
            )
            .eq("location", displayLocation.id)
            .eq("state", 1)
            .not("profile.deleted", "eq", true)
            .order("inserted_at", { ascending: false });

          if (error) {
            console.error("Error fetching location reviews:", error);
            setLoadingReviews(false);
            return;
          }

          // Filter out reviews from blocked users
          const filteredReviews = reviewsData.filter(
            (review: any) => !blockedIds.includes(review.user_id)
          );

          const reviewsWithFullUrl = await Promise.all(
            filteredReviews.map(async (review: any) => {
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
          console.error(
            "Unexpected error while fetching location reviews:",
            err
          );
          setLoadingReviews(false);
        }
      };

      loadReviews();
    }
  }, [displayLocation?.id, profile?.id]);

  useEffect(() => {
    if (
      displayLocation?.id &&
      loadedLocationIdRef.current !== displayLocation.id
    ) {
      loadedLocationIdRef.current = displayLocation.id;

      // Load location image
      loadLocationImage(displayLocation.id);

      // Load location reviews inline to avoid dependency issues
      const loadReviews = async () => {
        setLoadingReviews(true);
        try {
          // Get blocked user IDs to filter out their reviews
          const blockedIds = profile ? await getBlockedUserIds(profile.id) : [];

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
            user_id,
            profile:profiles!reviews_user_id_fkey1(id, username, avatar_url)
            `
            )
            .eq("location", displayLocation.id)
            .eq("state", 1)
            .not("profile.deleted", "eq", true)
            .order("inserted_at", { ascending: false });

          if (error) {
            console.error("Error fetching location reviews:", error);
            setLoadingReviews(false);
            return;
          }

          // Filter out reviews from blocked users
          const filteredReviews = reviewsData.filter(
            (review: any) => !blockedIds.includes(review.user_id)
          );

          const reviewsWithFullUrl = await Promise.all(
            filteredReviews.map(async (review: any) => {
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
          console.error(
            "Unexpected error while fetching location reviews:",
            err
          );
          setLoadingReviews(false);
        }
      };

      loadReviews();
    }
  }, [displayLocation?.id, profile?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.allRatingsContainer}>
          <View style={styles.ratingContainer}>
            <View style={styles.overallRatingCircle}>
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
          <View style={styles.ratingContainer}>
            <View style={styles.reviewCountCircle}>
              <Text style={styles.circleText}>
                {displayLocation?.total_ratings ?? 0}
              </Text>
            </View>
            <Text style={styles.circleLabel}>Reviews</Text>
          </View>
        </View>
        <View style={styles.addressRow}>
          <Text style={styles.locationAddress}>
            {stripNameFromAddress(
              displayLocation?.name ?? "",
              displayLocation?.address ?? ""
            )}
          </Text>
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
  allRatingsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  overallRatingCircle: {
    width: DIMENSIONS.ratingCircle,
    height: DIMENSIONS.ratingCircle,
    borderRadius: DIMENSIONS.ratingCircle / 2,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addressRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  locationAddress: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
    textAlign: "center",
  },
  ratingContainer: {
    alignItems: "center",
    flex: 1,
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
  reviewCountCircle: {
    width: DIMENSIONS.ratingCircle,
    height: DIMENSIONS.ratingCircle,
    borderRadius: DIMENSIONS.ratingCircle / 2,
    backgroundColor: COLORS.taste,
    justifyContent: "center",
    alignItems: "center",
  },
  circleText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  circleLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginTop: 6,
    textAlign: "center",
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

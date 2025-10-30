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
import imageCache from "@/utils/imageCache";
import RatingCircles from "@/components/RatingCircles";
import AnalyticService from "@/services/analyticsService";

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
        // Track view location event
        AnalyticService.capture('view_location', {
          locationId: data?.id,
          locationName: data?.name,
        });
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
      const imageUrl = await imageCache.getLocationImage(locationId);
      setLocationImage(imageUrl);
    } catch (err) {
      console.error("Unexpected error while downloading location image:", err);
      setLocationImage(null);
    } finally {
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

          // Get image URLs using cache
          const imagePaths = filteredReviews.map(
            (review: any) => review.image_url
          );
          const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

          const reviewsWithFullUrl = filteredReviews.map((review: any) => ({
            ...review,
            image_url: imageUrls[review.image_url] || review.image_url,
          }));
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

          // Get image URLs using cache
          const imagePaths = filteredReviews.map(
            (review: any) => review.image_url
          );
          const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

          const reviewsWithFullUrl = filteredReviews.map((review: any) => ({
            ...review,
            image_url: imageUrls[review.image_url] || review.image_url,
          }));
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
        <RatingCircles
          location={displayLocation || {}}
          circleSize={DIMENSIONS.ratingCircle}
        />
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

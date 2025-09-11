import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import ReviewItem from "@/components/ReviewItem";
import { Review } from "@/types/types";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import LikeSlider from "@/components/LikeSlider";
import CommentsSlider from "@/components/CommentsSlider";
import { setGlobalScrollToTop } from "@/utils/scrollUtils";

// Constants for optimization
const PAGE_SIZE = 20; // Increased from 10 to 20 for smoother scrolling
const MAX_CACHED_ITEMS = 100; // Increased from 50 to 100 to accommodate larger page size
const END_REACHED_THRESHOLD = 0.3;
const REFRESH_THRESHOLD = 100; // ms

// Performance monitoring
const PERFORMANCE_CONFIG = {
  enableLogging: __DEV__,
  logInterval: 5000, // Log performance every 5 seconds
} as const;

// Performance monitoring removed to prevent unnecessary renders

// Simplified state management - no custom hook to avoid re-render issues

function Home() {
  const { profile, updateProfile } = useProfile();
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Direct state management to avoid re-render issues
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // usePerformanceMonitor(PERFORMANCE_CONFIG.enableLogging); // Disabled to prevent unnecessary renders

  useEffect(() => {
    if (profile?.id) {
      loadReviews(true);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile && !profile.username) setShowUsernameModal(true);
    else setShowUsernameModal(false);
  }, [profile]);

  // Memoized followed user IDs to prevent unnecessary refetches
  const followedUserIds = useCallback(async (): Promise<string[]> => {
    if (!profile) return [];
    const { data, error } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", profile.id);
    if (error) {
      console.error("Error fetching followed users:", error);
      return [];
    }
    return data.map((row: any) => row.following_id);
  }, [profile?.id]);

  // Optimized image URL generation with caching
  const generateImageUrls = useCallback(async (reviews: any[]) => {
    const urlPromises = reviews.map(async (review) => {
      try {
        const { data } = await supabase.storage
          .from("review_images")
          .createSignedUrl(review.image_url, 3600); // 1 hour cache
        return {
          ...review,
          image_url: data?.signedUrl || review.image_url,
          location: review.location
            ? { ...review.location, id: review.location.id || "" }
            : undefined,
        };
      } catch (error) {
        console.error("Error generating image URL:", error);
        return review;
      }
    });

    return Promise.all(urlPromises);
  }, []);

  const loadReviews = useCallback(
    async (refresh = false) => {
      if (!profile) return;

      // Prevent rapid successive calls
      const now = Date.now();
      if (!refresh && now - lastRefreshTime < REFRESH_THRESHOLD) {
        return;
      }

      const nextPage = refresh ? 0 : page + 1;

      // Set loading states
      if (refresh) {
        if (page === 0) setLoading(true);
        setRefreshing(true);
      } else {
        if (!hasMore) return;
        setLoadingMore(true);
      }

      setError(null);

      try {
        const start = nextPage * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        const followedIds = await followedUserIds();
        const queryUserIds = followedIds.includes(profile.id)
          ? followedIds
          : [...followedIds, profile.id];

        const { data: reviewsDataFromDB, error } = await supabase
          .from("reviews")
          .select(
            `
          id,
          comment,
          image_url,
          inserted_at,
          taste,
          presentation,
          location:locations!reviews_location_fkey(id, name, address),
          spirit:spirit(name),
          type:type(name),
          user_id,
          profile:profiles!user_id(id, username, avatar_url)
        `
          )
          .eq("state", 1)
          .in("user_id", queryUserIds)
          .order("inserted_at", { ascending: false })
          .range(start, end);

        if (error) {
          throw error;
        }

        // Generate image URLs in parallel
        const reviewsWithUrls = await generateImageUrls(
          reviewsDataFromDB || []
        );

        // Update state
        if (refresh) {
          setReviews(
            reviewsWithUrls.length > MAX_CACHED_ITEMS
              ? reviewsWithUrls.slice(-MAX_CACHED_ITEMS)
              : reviewsWithUrls
          );
        } else {
          setReviews((prev) => {
            const newReviews = [...prev, ...reviewsWithUrls];
            return newReviews.length > MAX_CACHED_ITEMS
              ? newReviews.slice(-MAX_CACHED_ITEMS)
              : newReviews;
          });
        }

        setPage(nextPage);
        setHasMore(reviewsWithUrls.length === PAGE_SIZE);
        setLastRefreshTime(now);

        if (refresh) {
          setRefreshing(false);
          setLoading(false);
          if (!firstLoadDone) setFirstLoadDone(true);
        } else {
          setLoadingMore(false);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load reviews"
        );

        if (refresh) {
          setRefreshing(false);
          setLoading(false);
          if (!firstLoadDone) setFirstLoadDone(true);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [profile?.id, followedUserIds, generateImageUrls]
  );

  const scrollToTop = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        loadReviews(true);
      }
      setGlobalScrollToTop(scrollToTop);

      return () => {
        setGlobalScrollToTop(null);
      };
    }, [profile?.id, scrollToTop])
  );

  // Optimized refresh handler with debouncing
  const onRefresh = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(() => {
      loadReviews(true);
    }, 100);
  }, [loadReviews]);

  // Optimized end reached handler
  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !refreshing) {
      loadReviews(false);
    }
  }, [loadingMore, hasMore, refreshing, loadReviews]);

  const handleSaveUsername = useCallback(async () => {
    if (!newUsername.trim()) return;
    const { error } = await updateProfile({ username: newUsername.trim() });
    if (!error) {
      setShowUsernameModal(false);
      setNewUsername("");
    }
  }, [newUsername, updateProfile]);

  // Memoized empty component
  const renderEmpty = useCallback(() => {
    if (!firstLoadDone || loading || refreshing) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadReviews(true)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No reviews available.</Text>
      </View>
    );
  }, [firstLoadDone, loading, refreshing, error, loadReviews]);

  // Memoized footer component for loading more
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#10B981" />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  }, [loadingMore]);

  // Memoized review item renderer
  const renderReviewItem = useCallback(
    ({ item }: { item: Review }) => (
      <ReviewItem
        review={item}
        canDelete={false}
        onShowLikes={(id: string) => setSelectedReviewId(id)}
        onShowComments={() => setSelectedCommentReview(item)}
        onCommentAdded={(reviewId, newComment) => {
          setReviews((prev) =>
            prev.map((review) =>
              review.id === reviewId
                ? {
                    ...review,
                    _commentPatch: { action: "add", data: newComment },
                  }
                : review
            )
          );
        }}
        onCommentDeleted={(reviewId, commentId) => {
          setReviews((prev) =>
            prev.map((review) =>
              review.id === reviewId
                ? {
                    ...review,
                    _commentPatch: { action: "delete", id: commentId },
                  }
                : review
            )
          );
        }}
      />
    ),
    []
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  if (!firstLoadDone) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with logo */}
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/tini-time-logo-2x.png")}
          style={styles.headerLogo}
          resizeMode="cover"
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10B981"]}
            tintColor="#10B981"
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={20}
        windowSize={15}
      />

      <Modal visible={showUsernameModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Welcome to Tini Time Club</Text>
            <Text style={styles.modalSubTitle}>Set Your Username</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Enter username"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSaveUsername}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {selectedReviewId && (
        <LikeSlider
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
        />
      )}

      {selectedCommentReview && (
        <CommentsSlider
          review={selectedCommentReview}
          onClose={() => setSelectedCommentReview(null)}
          onCommentAdded={(reviewId, newComment) => {
            setReviews((prev) =>
              prev.map((review) =>
                review.id === reviewId
                  ? {
                      ...review,
                      _commentPatch: { action: "add", data: newComment },
                    }
                  : review
              )
            );
          }}
          onCommentDeleted={(reviewId, commentId) => {
            setReviews((prev) =>
              prev.map((review) =>
                review.id === reviewId
                  ? {
                      ...review,
                      _commentPatch: { action: "delete", id: commentId },
                    }
                  : review
              )
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    shadowOffset: { width: 0, height: 0.25 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 8,
    alignItems: "flex-start",
  },
  headerLogo: {
    width: 50,
    height: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ff4444",
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  footerLoaderText: {
    fontSize: 14,
    color: "#10B981",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: "90%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000",
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000",
  },
  inputField: {
    marginVertical: 4,
    height: 50,
    width: "90%",
    borderWidth: 1,
    borderColor: "#10B981", // Green border like login page
    borderRadius: 5,
    padding: 10,
    color: "#000",
    backgroundColor: "#fafafa",
  },
  modalButton: {
    marginVertical: 15,
    alignItems: "center",
    backgroundColor: "#10B981", // Green background like login page
    padding: 12,
    borderRadius: 5,
    minWidth: 100,
    fontSize: 16,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Home;

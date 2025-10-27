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
  Alert,
  Animated,
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
import EULAModal from "@/components/EULAModal";
import { getBlockedUserIds } from "@/utils/blockUtils";
import imageCache from "@/utils/imageCache";
import databaseService from "@/services/databaseService";
import { Ionicons } from "@expo/vector-icons";
import { isDevelopmentMode } from "@/utils/helpers";
import { useRouter } from "expo-router";
import { Filter } from "bad-words";
import { Button, Input } from "@/components/shared";

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
  const { profile, updateProfile, acceptEULA } = useProfile();
  const router = useRouter();
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [showEULAModal, setShowEULAModal] = useState(false);
  const [eulaLoading, setEulaLoading] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState<{
    isValid: boolean;
    message: string;
    isChecking: boolean;
  }>({ isValid: false, message: "", isChecking: false });
  const flatListRef = useRef<FlatList>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Direct state management to avoid re-render issues
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  const headerHeightAnim = useRef(new Animated.Value(68)).current; // Initial header height

  // usePerformanceMonitor(PERFORMANCE_CONFIG.enableLogging); // Disabled to prevent unnecessary renders

  useEffect(() => {
    if (profile?.id) {
      loadReviews(true);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile) {
      // Check if user needs to accept EULA (first time user or EULA not accepted)
      // Default to showing EULA if eula_accepted field doesn't exist or is false
      if (
        profile.eula_accepted === undefined ||
        profile.eula_accepted === false ||
        profile.eula_accepted === null
      ) {
        setShowEULAModal(true);
        setShowUsernameModal(false);
      } else if (!profile.username) {
        setShowUsernameModal(true);
        setShowEULAModal(false);
      } else {
        setShowUsernameModal(false);
        setShowEULAModal(false);
      }
    }
  }, [profile]);

  const loadReviews = useCallback(
    async (refresh = false) => {
      if (!profile) return;

      // Clear review cache when refreshing to get fresh avatar data
      if (refresh) {
        await databaseService.clearReviewCaches();
      }

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

        // Get reviews using optimized database service
        const reviewsDataFromDB = await databaseService.getReviews({
          currentUserId: profile.id,
          limit: PAGE_SIZE,
          offset: start,
          excludeBlocked: true,
        });

        if (!reviewsDataFromDB) {
          throw new Error("Failed to fetch reviews");
        }

        // Generate image URLs using cache
        const reviewsWithUrls = await (async (reviews: any[]) => {
          if (reviews.length === 0) return [];

          // Get all image URLs using batch processing
          const imagePaths = reviews.map((review) => review.image_url);
          const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

          return reviews.map((review) => ({
            ...review,
            image_url: imageUrls[review.image_url] || review.image_url,
            location: review.location
              ? { ...review.location, id: review.location.id || "" }
              : undefined,
          }));
        })(reviewsDataFromDB || []);

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
    [profile?.id, page, hasMore, lastRefreshTime]
  );

  const scrollToTop = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  // Handle scroll events to adjust logo scale and header height in real-time
  const handleScroll = useCallback(
    (event: any) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      const maxScroll = 150; // Logo should be small by 150px scroll

      // Calculate progress (0 to 1) based on scroll position
      const progress = Math.min(scrollY / maxScroll, 1);

      // Interpolate scale from 1 to 0.75 based on scroll progress
      const scale = 1 - progress * 0.25; // 1 to 0.75

      // Interpolate header height from 68 to 48 based on scroll progress
      const headerHeight = 68 - progress * 20; // 68 to 48

      // Update animations directly without timing for immediate response
      logoScaleAnim.setValue(scale);
      headerHeightAnim.setValue(headerHeight);
    },
    [logoScaleAnim, headerHeightAnim]
  );

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

  // Optimized refresh handler
  const onRefresh = useCallback(() => {
    loadReviews(true);
  }, [loadReviews]);

  // Optimized end reached handler
  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !refreshing) {
      loadReviews(false);
    }
  }, [loadingMore, hasMore, refreshing, loadReviews]);

  // Initialize bad-words filter
  const badWordsFilter = new Filter();

  // Check if username contains inappropriate content using bad-words package
  const isExplicitUsername = (username: string) => {
    return badWordsFilter.isProfane(username);
  };

  // Check if username is unique
  const checkUsernameUnique = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .eq("deleted", false)
        .maybeSingle();

      if (error) {
        console.error("Error checking username uniqueness:", error);
        return false;
      }

      return !data; // Return true if no data found (username is unique)
    } catch (error) {
      console.error("Unexpected error checking username:", error);
      return false;
    }
  };

  // Debounced username validation
  const validateUsernameDebounced = useCallback(async (username: string) => {
    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    const trimmedUsername = username.trim();

    // Immediate validation for basic rules
    if (!trimmedUsername) {
      setUsernameValidation({ isValid: false, message: "", isChecking: false });
      return;
    }

    // Check for explicit content
    if (isExplicitUsername(trimmedUsername)) {
      setUsernameValidation({
        isValid: false,
        message: "Username contains inappropriate language",
        isChecking: false,
      });
      return;
    }

    // Check username length
    if (trimmedUsername.length < 3) {
      setUsernameValidation({
        isValid: false,
        message: "Username must be at least 3 characters",
        isChecking: false,
      });
      return;
    }

    if (trimmedUsername.length > 20) {
      setUsernameValidation({
        isValid: false,
        message: "Username must be 20 characters or less",
        isChecking: false,
      });
      return;
    }

    // Check for valid characters
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setUsernameValidation({
        isValid: false,
        message: "Username can only contain letters, numbers, and underscores",
        isChecking: false,
      });
      return;
    }

    // Set checking state
    setUsernameValidation({
      isValid: false,
      message: "Checking availability...",
      isChecking: true,
    });

    // Debounce the uniqueness check
    validationTimeoutRef.current = setTimeout(async () => {
      const isUnique = await checkUsernameUnique(trimmedUsername);
      if (isUnique) {
        setUsernameValidation({
          isValid: true,
          message: "Username is available!",
          isChecking: false,
        });
      } else {
        setUsernameValidation({
          isValid: false,
          message: "Username is already taken",
          isChecking: false,
        });
      }
    }, 500); // 500ms debounce
  }, []);

  const handleSaveUsername = useCallback(async () => {
    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername || !usernameValidation.isValid) return;

    try {
      const result = await updateProfile({ username: trimmedUsername });
      if (result.error) {
        console.error("Error saving username:", result.error);
        Alert.alert("Error", "Failed to save username. Please try again.", [
          { text: "OK" },
        ]);
        return;
      }

      // Only close modal if update was successful
      setShowUsernameModal(false);
      setNewUsername("");
      setUsernameValidation({ isValid: false, message: "", isChecking: false });
    } catch (error) {
      console.error("Unexpected error saving username:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.", [
        { text: "OK" },
      ]);
    }
  }, [newUsername, updateProfile, usernameValidation.isValid]);

  const handleAcceptEULA = useCallback(async () => {
    if (eulaLoading) return; // Prevent multiple submissions

    try {
      setEulaLoading(true);
      const result = await acceptEULA();

      if (result.error) {
        console.error("Error accepting EULA:", result.error);
        // Don't close modal on error, let user try again
        return;
      }

      setShowEULAModal(false);
    } catch (error) {
      console.error("Unexpected error accepting EULA:", error);
      // Don't close modal on unexpected error
    } finally {
      setEulaLoading(false);
    }
  }, [acceptEULA, eulaLoading]);

  const handleDeclineEULA = useCallback(() => {
    // User declined EULA - they should be logged out
    // This will be handled by the auth state change in the root layout
    supabase.auth.signOut();
  }, []);

  const navigateToLocations = useCallback(() => {
    router.push("/(tabs)/locations");
  }, [router]);

  const navigateToReview = useCallback(() => {
    router.push("/(tabs)/review");
  }, [router]);

  const navigateToDiscover = useCallback(() => {
    router.push("/(tabs)/discover");
  }, [router]);

  // Memoized empty component
  const renderEmpty = useCallback(() => {
    if (!firstLoadDone || loading || refreshing) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Button
            title="Retry"
            onPress={() => loadReviews(true)}
            variant="primary"
            size="medium"
          />
        </View>
      );
    }

    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.heroSection}>
          <Text style={styles.heroSubtitle}>
            Start your cocktail journey by discovering amazing drinks and
            sharing your own experiences.
          </Text>
        </View>

        <View style={styles.stepsContainer}>
          <TouchableOpacity
            style={styles.stepCard}
            onPress={navigateToLocations}
            activeOpacity={0.7}
          >
            <View style={styles.stepIconContainer}>
              <Ionicons name="map-outline" size={24} color="#ffffff" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Discover Locations</Text>
              <Text style={styles.stepDescription}>
                Browse the map to find the best martini near you
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={navigateToReview}
            activeOpacity={0.7}
          >
            <View style={styles.stepIconContainer}>
              <Image
                source={require("@/assets/images/martini_transparent.png")}
                style={[styles.martiniIcon, { tintColor: "#ffffff" }]}
                resizeMode="contain"
              />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Try A Martini</Text>
              <Text style={styles.stepDescription}>
                Order something new and take a photo
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={navigateToReview}
            activeOpacity={0.7}
          >
            <View style={styles.stepIconContainer}>
              <Ionicons name="camera-outline" size={24} color="#ffffff" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share Your Review</Text>
              <Text style={styles.stepDescription}>
                Rate the taste, presentation, and share your thoughts
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stepCard}
            onPress={navigateToDiscover}
            activeOpacity={0.7}
          >
            <View style={styles.stepIconContainer}>
              <Ionicons name="search-outline" size={24} color="#ffffff" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Connect With Others</Text>
              <Text style={styles.stepDescription}>
                Follow fellow Martini lovers and discover new favorites
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [firstLoadDone, loading, refreshing, error, loadReviews]);

  // Memoized footer component for loading more
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#B6A3E2" />
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  if (!firstLoadDone) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B6A3E2" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with logo and search icon */}
      <Animated.View style={[styles.header, { height: headerHeightAnim }]}>
        {/* Development mode indicator */}
        {isDevelopmentMode() && (
          <View style={styles.devIndicator}>
            <Text style={styles.devText}>DEV</Text>
            <Button
              title="Press me"
              onPress={() => {
                console.log("Button pressed!");
              }}
            />
          </View>
        )}

        <Animated.Image
          source={require("@/assets/images/tini-time-logo-2x.png")}
          style={[
            styles.headerLogo,
            {
              transform: [{ scale: logoScaleAnim }],
            },
          ]}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.searchIconContainer}
          onPress={navigateToDiscover}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={24} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#B6A3E2"]}
            tintColor="#B6A3E2"
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
        onScroll={handleScroll}
        scrollEventThrottle={1}
      />

      <EULAModal
        visible={showEULAModal}
        onAccept={handleAcceptEULA}
        onDecline={handleDeclineEULA}
        loading={eulaLoading}
      />

      <Modal visible={showUsernameModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Your Username</Text>
            <Input
              placeholder="Enter username"
              value={newUsername}
              onChangeText={(text) => {
                setNewUsername(text);
                validateUsernameDebounced(text);
              }}
              type="text"
              size="medium"
              variant="default"
              autoCapitalize="none"
            />

            {/* Validation Message */}
            {usernameValidation.message && (
              <Text
                style={[
                  styles.validationMessage,
                  usernameValidation.isValid && styles.validationSuccess,
                  usernameValidation.isChecking && styles.validationChecking,
                ]}
              >
                {usernameValidation.message}
              </Text>
            )}

            <Button
              title={usernameValidation.isChecking ? "Checking..." : "Save"}
              onPress={handleSaveUsername}
              disabled={
                !usernameValidation.isValid || usernameValidation.isChecking
              }
              loading={usernameValidation.isChecking}
              variant="primary"
              size="medium"
              fullWidth
            />
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
    flexDirection: "row",
    shadowOffset: { width: 0, height: 0.25 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  searchIconContainer: {
    position: "absolute",
    right: 16,
    padding: 8,
  },
  devIndicator: {
    position: "absolute",
    left: 16,
    backgroundColor: "#ff4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  devText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    color: "#B6A3E2",
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
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  footerLoaderText: {
    fontSize: 14,
    color: "#B6A3E2",
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
    borderRadius: 12,
    width: "90%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000",
    textAlign: "center",
  },
  modalSubTitle: {
    fontSize: 14,
    fontWeight: "normal",
    marginBottom: 12,
    color: "#000",
  },
  validationMessage: {
    fontSize: 14,
    color: "#ff4444",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  validationSuccess: {
    color: "#B6A3E2",
  },
  validationChecking: {
    color: "#6b7280",
  },
  rulesContainer: {
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  ruleItem: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    letterSpacing: -0.2,
  },
  stepsContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  stepCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#B6A3E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  stepDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 19,
  },
  martiniIcon: {
    width: 24,
    height: 24,
  },
});

export default Home;

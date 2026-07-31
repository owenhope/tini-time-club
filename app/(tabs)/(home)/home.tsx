import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Animated,
  type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import ReviewItem from "@/components/ReviewItem";
import { Review } from "@/types/types";
import { useFocusEffect , useRouter } from "expo-router";
import LikeSlider from "@/components/LikeSlider";
import CommentsSlider from "@/components/CommentsSlider";
import { setGlobalScrollToTop } from "@/utils/scrollUtils";
import EULAModal from "@/components/EULAModal";
import authCache from "@/utils/authCache";
import { unregisterPushNotificationsAsync } from "@/services/pushNotificationService";
import databaseService from "@/services/databaseService";
import { Ionicons } from "@expo/vector-icons";
import { Filter } from "bad-words";
import { Image as ExpoImage } from "expo-image";
import { Button, Input } from "@/components/shared";
import useCollapsibleHeader from "@/hooks/useCollapsibleHeader";
import { makeStyles, useTheme } from "@/theme";

// Built once: constructing the profanity list is expensive and the filter is
// stateless, so a per-render instance was pure waste.
const badWordsFilter = new Filter();
const isExplicitUsername = (username: string) =>
  badWordsFilter.isProfane(username);

// Constants for optimization
const PAGE_SIZE = 20; // Increased from 10 to 20 for smoother scrolling
const MAX_CACHED_ITEMS = 100; // Increased from 50 to 100 to accommodate larger page size
const END_REACHED_THRESHOLD = 0.3;
const REFRESH_THRESHOLD = 100; // ms
// How long the feed may sit unfocused before a re-focus triggers a refresh.
const FOCUS_REFRESH_AFTER = 2 * 60 * 1000; // 2 minutes

// Simplified state management - no custom hook to avoid re-render issues

function Home() {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
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
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Direct state management to avoid re-render issues
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [visibleReviewIds, setVisibleReviewIds] = useState<Set<string>>(
    () => new Set()
  );
  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 50, minimumViewTime: 100 }),
    []
  );
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next = new Set(
        viewableItems
          .filter((token) => token.isViewable)
          .map((token) => String((token.item as Review).id))
      );

      setVisibleReviewIds((current) => {
        if (
          current.size === next.size &&
          [...current].every((id) => next.has(id))
        ) {
          return current;
        }
        return next;
      });
    },
    []
  );
  // Same scroll-following collapse as every other shrinking header.
  const { progress: headerProgress, onScroll: handleScroll } =
    useCollapsibleHeader();
  const logoScale = headerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.75],
  });
  const headerHeight = headerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [68, 48],
  });

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
    // `silent` refreshes the data without the spinners — used by the
    // focus-staleness refresh so returning to the feed doesn't flash a
    // loading state over content that's already on screen.
    async (refresh = false, silent = false) => {
      if (!profile) return;

      // Prevent rapid successive calls
      const now = Date.now();
      if (!refresh && now - lastRefreshTime < REFRESH_THRESHOLD) {
        return;
      }

      const nextPage = refresh ? 0 : page + 1;

      // Set loading states
      if (refresh) {
        if (!silent) {
          if (page === 0) setLoading(true);
          setRefreshing(true);
        }
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
          forceRefresh: refresh,
        });

        if (!reviewsDataFromDB) {
          throw new Error("Failed to fetch reviews");
        }

        if (__DEV__) {
          console.log(`[Feed] Loaded ${reviewsDataFromDB.length} reviews`);
        }

        // getReviews returns image_url already hydrated to a signed URL.
        const reviewsWithUrls = reviewsDataFromDB;

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

  useFocusEffect(
    useCallback(() => {
      // Refresh on focus only when the feed has actually gone stale. Doing it
      // unconditionally cleared the caches and reset scroll position every
      // time the user tabbed away and back, even seconds later.
      const isStale = Date.now() - lastRefreshTime > FOCUS_REFRESH_AFTER;
      if (profile?.id && (reviews.length === 0 || isStale)) {
        // Silent: the stale content is already visible; swap it in place
        // instead of flashing a spinner on every return to the feed.
        loadReviews(true, reviews.length > 0);
      }
      setGlobalScrollToTop(scrollToTop);

      return () => {
        setGlobalScrollToTop(null);
      };
      // loadReviews/lastRefreshTime intentionally excluded: including them
      // would re-run this on every fetch, defeating the staleness check.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id, scrollToTop, reviews.length])
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

  // Preload images for visible and upcoming items (optimized)
  useEffect(() => {
    if (reviews.length > 0) {
      // Preload more items for smoother scrolling
      const preloadCount = Math.min(15, reviews.length);
      // review.image_url already holds a signed URL (resolved in loadReviews);
      // re-resolving it here would sign the signed URL and 400.
      // Prefetch through expo-image: the cards render with ExpoImage, so
      // RN's Image.prefetch warmed a cache nothing reads and every photo
      // downloaded twice.
      const urls = reviews
        .slice(0, preloadCount)
        .map((review) => review.image_url)
        .filter(
          (url): url is string =>
            typeof url === "string" && url.startsWith("http")
        );
      if (urls.length > 0) {
        void ExpoImage.prefetch(urls, { cachePolicy: "memory-disk" });
      }
    }
  }, [reviews.length]);

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

  const handleDeclineEULA = useCallback(async () => {
    // User declined EULA - they should be logged out
    try {
      await unregisterPushNotificationsAsync();
      // Clear cache first
      await authCache.invalidateCache();
      // Sign out - navigation will be handled by auth state change in root layout
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out after EULA decline:", error);
    }
  }, []);

  const navigateToLocations = useCallback(() => {
    router.navigate("/places");
  }, [router]);

  const navigateToReview = useCallback(() => {
    router.navigate("/review");
  }, [router]);

  const navigateToDiscover = useCallback(() => {
    router.navigate("/discover");
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
              <Ionicons name="map-outline" size={24} color={colors.onAccent} />
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
                style={[styles.martiniIcon, { tintColor: colors.onAccent }]}
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
              <Ionicons
                name="camera-outline"
                size={24}
                color={colors.onAccent}
              />
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
              <Ionicons
                name="search-outline"
                size={24}
                color={colors.onAccent}
              />
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
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  }, [loadingMore]);

  // Stable callbacks to prevent re-renders
  const handleShowLikes = useCallback((id: string) => {
    setSelectedReviewId(id);
  }, []);

  const handleShowComments = useCallback((item: Review) => {
    setSelectedCommentReview(item);
  }, []);

  const handleCommentAdded = useCallback(
    (reviewId: string, newComment: any) => {
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
    },
    []
  );

  const handleCommentDeleted = useCallback(
    (reviewId: string, commentId: number) => {
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
    },
    []
  );

  // Memoized review item renderer with stable callbacks
  const renderReviewItem = useCallback(
    ({ item }: { item: Review }) => {
      const isOwnReview =
        profile && String(profile.id) === String(item.user_id);
      return (
        <ReviewItem
          review={item}
          canDelete={false}
          onEdit={
            isOwnReview
              ? () => router.push(`/edit-caption?reviewId=${item.id}`)
              : undefined
          }
          onShowLikes={handleShowLikes}
          onShowComments={() => handleShowComments(item)}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
          isVisible={visibleReviewIds.has(String(item.id))}
        />
      );
    },
    [
      profile,
      router,
      handleShowLikes,
      handleShowComments,
      handleCommentAdded,
      handleCommentDeleted,
      visibleReviewIds,
    ]
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
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with add button, logo and search icon */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <TouchableOpacity
          style={styles.addButtonContainer}
          onPress={() => router.push("/review")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Share a Martini review"
        >
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
        <Animated.Image
          key={isDark ? "home-logo-dark" : "home-logo-light"}
          accessibilityRole="header"
          accessibilityLabel="Tini Time Club"
          source={require("@/assets/images/tini-time-logo-2x.png")}
          // The logo artwork is dark green; on the dark surface it drops to
          // roughly 1.5:1. Tint it to the text colour there. Light mode keeps
          // the original two-colour mark.
          style={[
            styles.headerLogo,
            {
              tintColor: isDark ? colors.text : undefined,
              transform: [{ scale: logoScale }],
            },
          ]}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.searchIconContainer}
          onPress={navigateToDiscover}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Search people and places"
        >
          <Ionicons name="search-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        // Each card is ~1.3 screens tall (square photo + header + footer), so
        // 3 items is already several screens of runway; 10 meant mounting a
        // dozen screens of content and photo decodes before first paint.
        initialNumToRender={3}
        windowSize={5}
        extraData={visibleReviewIds}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: "row" as const,
    shadowOffset: { width: 0, height: 0.25 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  addButtonContainer: {
    position: "absolute" as const,
    left: t.spacing.lg,
    padding: t.spacing.sm,
  },
  searchIconContainer: {
    position: "absolute" as const,
    right: t.spacing.lg,
    padding: t.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    color: t.colors.accent,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    padding: t.spacing.xl - 4,
    alignItems: "center" as const,
    gap: 10,
  },
  errorText: {
    fontSize: 15,
    color: t.colors.danger,
    textAlign: "center" as const,
    marginBottom: 10,
  },
  footerLoader: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingVertical: t.spacing.xl - 4,
    gap: 10,
  },
  footerLoaderText: {
    fontSize: 13,
    color: t.colors.accent,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: t.colors.overlay,
  },
  modalContent: {
    backgroundColor: t.colors.surface,
    paddingVertical: t.spacing.xl - 4,
    paddingHorizontal: 40,
    borderRadius: t.radius.md,
    width: "90%" as const,
    alignItems: "center" as const,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    marginBottom: t.spacing.md,
    color: t.colors.text,
    textAlign: "center" as const,
  },
  validationMessage: {
    fontSize: 13,
    color: t.colors.danger,
    textAlign: "center" as const,
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  validationSuccess: {
    color: t.colors.accent,
  },
  validationChecking: {
    color: t.colors.textMuted,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: t.spacing.xl - 4,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center" as const,
    marginBottom: 40,
    paddingHorizontal: t.spacing.xl - 4,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: t.colors.text,
    textAlign: "center" as const,
    lineHeight: 22,
    maxWidth: 320,
    letterSpacing: 0,
  },
  stepsContainer: {
    flex: 1,
    paddingHorizontal: t.spacing.xs,
  },
  stepCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.xl - 4,
    marginBottom: t.spacing.lg,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    ...t.elevation.card,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: t.spacing.lg,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: t.colors.text,
    marginBottom: t.spacing.xs,
    letterSpacing: 0,
  },
  stepDescription: {
    fontSize: 13,
    color: t.colors.textMuted,
    lineHeight: 19,
  },
  martiniIcon: {
    width: 24,
    height: 24,
  },
}));

export default Home;

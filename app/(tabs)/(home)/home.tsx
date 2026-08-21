import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import ReviewItem from "@/components/ReviewItem";
import { Review } from "@/types/types";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import LikeSlider from "@/components/LikeSlider";
import CommentsSlider from "@/components/CommentsSlider";
import { setGlobalScrollToTop } from "@/utils/scrollUtils";
import databaseService from "@/services/databaseService";
import { Ionicons } from "@expo/vector-icons";
import { Filter } from "bad-words";
import { Button, Input, MartiniIcon } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { log, reportError, warn } from "@/utils/log";
import { routes } from "@/utils/routes";
import { subscribeToReviewUpdates } from "@/utils/reviewEvents";
import { getTiniTimeGreeting } from "@/utils/tiniTime";
import { withTimeout } from "@/utils/async";
import AppHeader from "@/components/nav/AppHeader";
import { isScreenshotSeed } from "@/utils/screenshotMode";
import { useActivity } from "@/context/activity-context";
import { useMembership } from "@/context/membership-context";

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
const FEED_LOAD_ERROR_MESSAGE = "We couldn't load the club right now.";
type FeedSource = "club" | "people";
// A refresh is newest-first, so keep the head; an appended page arrives at the
// end, so keep the tail or pagination silently dead-ends once the cache is
// full (pagination offsets track `page`, not the retained window).
const limitRefreshedReviews = (items: Review[]) =>
  items.length > MAX_CACHED_ITEMS ? items.slice(0, MAX_CACHED_ITEMS) : items;
const limitAppendedReviews = (items: Review[]) =>
  items.length > MAX_CACHED_ITEMS ? items.slice(-MAX_CACHED_ITEMS) : items;

// Simplified state management - no custom hook to avoid re-render issues

function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile, authenticated, updateProfile } = useProfile();
  const { unseenCount, refreshUnseenCount } = useActivity();
  const { requireMembership } = useMembership();
  const showActivityDot = unseenCount > 0;
  const router = useRouter();
  const params = useLocalSearchParams<{
    postedReviewId?: string;
    feedRefresh?: string;
    screenshotSeed?: string;
  }>();
  const isScreenshotFeed = isScreenshotSeed(params.screenshotSeed, "feed");
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [usernameValidation, setUsernameValidation] = useState<{
    isValid: boolean;
    message: string;
    isChecking: boolean;
  }>({ isValid: false, message: "", isChecking: false });
  const flatListRef = useRef<FlatList>(null);
  const handledFeedRefreshRef = useRef<string | null>(null);
  const handledScreenshotFeedRef = useRef(false);
  const latestFeedRequestRef = useRef(0);
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
  const [feedSource, setFeedSource] = useState<FeedSource>("club");
  // A different line every day of the week — the block is the first thing the
  // club says to you, and saying the same thing seven days running is how a
  // welcome stops being read.
  const greeting = getTiniTimeGreeting();

  useEffect(() => {
    if (profile) {
      // Check if user needs to accept EULA (first time user or EULA not accepted)
      // Default to showing EULA if eula_accepted field doesn't exist or is false
      if (
        profile.eula_accepted === undefined ||
        profile.eula_accepted === false ||
        profile.eula_accepted === null
      ) {
        setShowUsernameModal(false);
        router.replace(routes.onboarding());
      } else if (!profile.username) {
        setShowUsernameModal(true);
      } else {
        setShowUsernameModal(false);
      }
    }
  }, [profile, router]);

  const loadReviews = useCallback(
    // `silent` refreshes the data without the spinners — used by the
    // focus-staleness refresh so returning to the feed doesn't flash a
    // loading state over content that's already on screen.
    async (
      refresh = false,
      silent = false,
      sourceOverride: FeedSource = feedSource,
      bypassCache = refresh
    ) => {
      const source = isScreenshotFeed ? "club" : sourceOverride;

      // Prevent rapid successive calls
      const now = Date.now();
      if (!refresh && now - lastRefreshTime < REFRESH_THRESHOLD) {
        return;
      }

      const nextPage = refresh ? 0 : page + 1;

      // Set loading states
      if (refresh) {
        // Any in-flight pagination is superseded by a first-page refresh.
        setLoadingMore(false);
        if (!silent) {
          if (page === 0) setLoading(true);
          setRefreshing(true);
        }
      } else {
        if (!hasMore) return;
        setLoadingMore(true);
      }

      const requestId = latestFeedRequestRef.current + 1;
      latestFeedRequestRef.current = requestId;
      const isCurrentRequest = () => requestId === latestFeedRequestRef.current;

      setError(null);

      try {
        const start = nextPage * PAGE_SIZE;

        let screenshotUserId: string | undefined;
        if (isScreenshotFeed) {
          const { data: screenshotProfile, error: screenshotProfileError } =
            await supabase
              .from("profiles")
              .select("id")
              .eq("username", "stellavale")
              .single();

          if (screenshotProfileError) throw screenshotProfileError;
          screenshotUserId = screenshotProfile.id;
        }

        const reviewsPromise = databaseService.getReviews({
          userId: screenshotUserId,
          currentUserId: profile?.id,
          followedOnly: source === "people",
          limit: PAGE_SIZE,
          offset: start,
          excludeBlocked: true,
          forceRefresh: bypassCache,
        });

        // Get reviews using optimized database service
        const reviewsDataFromDB = await withTimeout(reviewsPromise, 25_000);

        if (!reviewsDataFromDB) {
          throw new Error("Failed to fetch reviews");
        }

        // A feed-source switch or newer refresh may have started while this
        // request was in flight. Never let the older response replace it.
        if (!isCurrentRequest()) return;

        log(`[Feed] Loaded ${reviewsDataFromDB.length} reviews`);

        // getReviews returns image_url already hydrated to a signed URL.
        const reviewsWithUrls = reviewsDataFromDB;

        // Update state
        if (refresh) {
          setReviews(limitRefreshedReviews(reviewsWithUrls));
        } else {
          setReviews((prev) =>
            limitAppendedReviews([...prev, ...reviewsWithUrls])
          );
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
        if (!isCurrentRequest()) return;

        // A feed dependency being unavailable is a recoverable product state,
        // not a crash. reportError intentionally opens React Native's red
        // developer overlay, which made a routine 404 impossible to dismiss.
        warn("[Feed] Unable to load reviews:", error);
        setError(FEED_LOAD_ERROR_MESSAGE);
        // An empty FlatList calls onEndReached while it is measuring itself.
        // Stop pagination until an explicit refresh succeeds, or one failed
        // first page becomes an unbounded request/error loop.
        setHasMore(false);

        if (refresh) {
          setRefreshing(false);
          setLoading(false);
          if (!firstLoadDone) setFirstLoadDone(true);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [profile?.id, page, hasMore, lastRefreshTime, isScreenshotFeed, feedSource]
  );

  const scrollToTop = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  useEffect(() => {
    if (!isScreenshotFeed) {
      handledScreenshotFeedRef.current = false;
      return;
    }

    if (!profile?.id || handledScreenshotFeedRef.current) return;
    handledScreenshotFeedRef.current = true;

    const refreshScreenshotFeed = async () => {
      setHasMore(true);
      await loadReviews(true, true);
      requestAnimationFrame(scrollToTop);
    };

    void refreshScreenshotFeed();
  }, [isScreenshotFeed, loadReviews, profile?.id, scrollToTop]);

  const feedRefreshToken = Array.isArray(params.feedRefresh)
    ? params.feedRefresh[0]
    : params.feedRefresh;

  useEffect(() => {
    if (!profile?.id || !feedRefreshToken) return;
    if (handledFeedRefreshRef.current === feedRefreshToken) return;

    handledFeedRefreshRef.current = feedRefreshToken;

    const refreshPostedReview = async () => {
      await loadReviews(true, true);
      requestAnimationFrame(scrollToTop);
    };

    void refreshPostedReview();
  }, [feedRefreshToken, loadReviews, profile?.id, scrollToTop]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnseenCount();
      // Refresh on focus only when the feed has actually gone stale. Doing it
      // unconditionally cleared the caches and reset scroll position every
      // time the user tabbed away and back, even seconds later.
      const isStale = Date.now() - lastRefreshTime > FOCUS_REFRESH_AFTER;
      if (reviews.length === 0 || isStale) {
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
    }, [profile?.id, refreshUnseenCount, scrollToTop, reviews.length])
  );

  // Optimized refresh handler
  const onRefresh = useCallback(() => {
    loadReviews(true);
  }, [loadReviews]);

  useEffect(
    () => subscribeToReviewUpdates(() => void loadReviews(true, true)),
    [loadReviews]
  );

  // Optimized end reached handler
  const onEndReached = useCallback(() => {
    if (!loading && !loadingMore && hasMore && !refreshing && !error) {
      loadReviews(false);
    }
  }, [error, hasMore, loadReviews, loading, loadingMore, refreshing]);

  const toggleFeedSource = useCallback(() => {
    if (!requireMembership("people-feed")) return;
    const nextSource: FeedSource = feedSource === "club" ? "people" : "club";
    setFeedSource(nextSource);
    setReviews([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    void loadReviews(true, true, nextSource, false);
    requestAnimationFrame(scrollToTop);
  }, [feedSource, loadReviews, requireMembership, scrollToTop]);

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
        reportError("Error checking username uniqueness:", error);
        return false;
      }

      return !data; // Return true if no data found (username is unique)
    } catch (error) {
      reportError("Unexpected error checking username:", error);
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
        reportError("Error saving username:", result.error);
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
      reportError("Unexpected error saving username:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.", [
        { text: "OK" },
      ]);
    }
  }, [newUsername, updateProfile, usernameValidation.isValid]);

  const navigateToLocations = useCallback(() => {
    router.navigate(routes.discover({ view: "map" }));
  }, [router]);

  const navigateToReview = useCallback(() => {
    if (requireMembership("review")) router.navigate(routes.review());
  }, [requireMembership, router]);

  const navigateToDiscover = useCallback(() => {
    router.navigate(routes.discover({ view: "members" }));
  }, [router]);

  // Memoized empty component
  const renderEmpty = useCallback(() => {
    if (!firstLoadDone || loading || refreshing) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{error}</Text>
          <Text style={styles.emptyText}>
            Check your connection and try again.
          </Text>
          <Button
            title="TRY AGAIN"
            onPress={() => loadReviews(true)}
            variant="primary"
            size="medium"
          />
        </View>
      );
    }

    if (!profile) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Nothing from the club yet</Text>
          <Text style={styles.emptyText}>
            Explore the map while we look for the next pour.
          </Text>
          <Button
            title="EXPLORE LOCATIONS"
            onPress={navigateToLocations}
            variant="secondary"
            size="medium"
          />
        </View>
      );
    }

    if (feedSource === "people") {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No reviews from your people yet.
          </Text>
          <Text style={styles.emptyText}>
            Follow members to build a smaller feed around their pours.
          </Text>
          <Button
            title="Find members"
            onPress={navigateToDiscover}
            variant="secondary"
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

          {profile && authenticated ? (
            <>
              <TouchableOpacity
                style={styles.stepCard}
                onPress={navigateToReview}
                activeOpacity={0.7}
              >
                <View style={styles.stepIconContainer}>
                  <MartiniIcon size={24} color={colors.onAccent} />
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
            </>
          ) : null}

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
  }, [
    firstLoadDone,
    loading,
    refreshing,
    error,
    feedSource,
    loadReviews,
    navigateToDiscover,
    navigateToLocations,
    navigateToReview,
    profile,
    colors.onAccent,
    styles,
  ]);

  // Memoized footer component for loading more
  /**
   * The club's welcome block, in the system's flat-colour register: an
   * uppercase tracked eyebrow over a lowercase display headline, which is the
   * wordmark's own voice.
   */
  const renderFeedHeader = useCallback(
    () => (
      <View style={styles.feedHeader}>
        <TouchableOpacity
          style={styles.feedSourceButton}
          onPress={toggleFeedSource}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={`Showing ${
            feedSource === "club" ? "From the Club" : "Your people"
          }. Tap to switch feed source.`}
        >
          <View style={styles.feedSourceText}>
            <Text style={styles.feedSourceEyebrow}>Feed</Text>
            <View style={styles.feedSourceTitleRow}>
              <Text style={styles.feedSourceTitle}>
                {feedSource === "club" ? "From the Club" : "Your people"}
              </Text>
              <Ionicons name="repeat" size={14} color={colors.accent} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    ),
    [colors.accent, feedSource, styles, toggleFeedSource]
  );

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
              ? () => router.push(routes.editReview(item.id))
              : undefined
          }
          onShowLikes={handleShowLikes}
          onShowComments={() => handleShowComments(item)}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
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
    ]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      latestFeedRequestRef.current += 1;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  if (!firstLoadDone) {
    // Wear the feed's own chrome while the first page loads. A bare centered
    // spinner read as one more screen in the arrival sequence (auth dismiss →
    // blank loader → feed); with the real header up immediately, the feed
    // only fills in below it.
    return (
      <View style={styles.container}>
        <AppHeader
          variant="large"
          title={greeting.headline}
          meta={greeting.subline}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        variant="large"
        title={greeting.headline}
        meta={greeting.subline}
        actions={
          profile
            ? [
                {
                  icon: "heart-outline",
                  iconColor: colors.onInk,
                  showNotificationDot: showActivityDot,
                  onPress: () => router.push(routes.activity()),
                  accessibilityLabel: showActivityDot
                    ? "Activity, new notifications"
                    : "Activity",
                },
              ]
            : [
                {
                  label: "Join",
                  onPress: () => router.push(routes.auth()),
                  accessibilityLabel: "Join the club",
                },
              ]
        }
      />

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
        ListHeaderComponent={firstLoadDone ? renderFeedHeader : null}
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
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  feedHeader: {
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.gutter,
  },
  feedSourceButton: {
    minHeight: 44,
    paddingVertical: t.spacing.xs,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  feedSourceText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  feedSourceEyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.accent,
  },
  feedSourceTitle: {
    ...t.typography.title,
    color: t.colors.text,
  },
  feedSourceTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.md,
    backgroundColor: t.colors.background,
  },
  loadingText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.xxl,
    gap: t.spacing.md,
  },
  emptyTitle: {
    ...t.typography.heading,
    color: t.colors.text,
    textAlign: "center" as const,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    maxWidth: 300,
  },
  errorText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
  },
  footerLoader: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingVertical: t.spacing.xl - 4,
    gap: 10,
  },
  footerLoaderText: {
    ...t.typography.caption,
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
    borderRadius: t.radius.sheet,
    width: "90%" as const,
    alignItems: "center" as const,
  },
  modalTitle: {
    ...t.typography.title,
    marginBottom: t.spacing.md,
    color: t.colors.text,
    textAlign: "center" as const,
  },
  validationMessage: {
    ...t.typography.caption,
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
    ...t.typography.bodyStrong,
    color: t.colors.text,
    textAlign: "center" as const,
    maxWidth: 320,
    letterSpacing: 0,
  },
  stepsContainer: {
    flex: 1,
    paddingHorizontal: t.spacing.xs,
  },
  stepCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
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
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: t.spacing.lg,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    marginBottom: t.spacing.xs,
    letterSpacing: 0,
  },
  stepDescription: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
}));

export default Home;

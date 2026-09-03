import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Animated,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import ReviewItem from "@/components/ReviewItem";
import { Review } from "@/types/types";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import LikeSlider from "@/components/LikeSlider";
import CommentsSlider from "@/components/CommentsSlider";
import { setGlobalScrollToTop } from "@/utils/scrollUtils";
import { getReviewPage, type ReviewCursor } from "@/services/reviewFeedService";
import {
  addReviewComment,
  deleteReviewComment,
} from "@/utils/reviewCommentUpdates";
import { Ionicons } from "@expo/vector-icons";
import { Button, MartiniIcon } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { log, warn } from "@/utils/log";
import { routes } from "@/utils/routes";
import { subscribeToReviewUpdates } from "@/utils/reviewEvents";
import { getTiniTimeGreeting } from "@/utils/tiniTime";
import { withTimeout } from "@/utils/async";
import AppHeader, { type HeaderAction } from "@/components/nav/AppHeader";
import { useCollapsibleHeader } from "@/hooks/useCollapsibleHeader";
import { isScreenshotSeed } from "@/utils/screenshotMode";
import { useActivity } from "@/context/activity-context";
import { useMembership } from "@/context/membership-context";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";

// Constants for optimization
const PAGE_SIZE = 20; // Increased from 10 to 20 for smoother scrolling
const MAX_CACHED_ITEMS = 100; // Increased from 50 to 100 to accommodate larger page size
const END_REACHED_THRESHOLD = 0.3;
const REFRESH_THRESHOLD = 100; // ms
// How long the feed may sit unfocused before a re-focus triggers a refresh.
const FOCUS_REFRESH_AFTER = 2 * 60 * 1000; // 2 minutes
// How far past the top a pull has to travel to count as pull-to-refresh —
// roughly where UIRefreshControl's own trigger sits.
const PULL_REFRESH_DISTANCE = 90;
// The refresh indicator stays up at least this long, so a fast response
// still reads as "the club went and looked" rather than a flicker.
const MIN_REFRESH_SPINNER_MS = 650;
const FEED_LOAD_ERROR_MESSAGE = "We couldn't load the club right now.";
type FeedSource = "club" | "people";
// A refresh is newest-first, so keep the head; an appended page arrives at the
// end, so keep the tail. Cursor pagination is independent of this retained
// render window, unlike the old array-length-derived offsets.
const limitRefreshedReviews = (items: Review[]) =>
  items.length > MAX_CACHED_ITEMS ? items.slice(0, MAX_CACHED_ITEMS) : items;
const limitAppendedReviews = (items: Review[]) =>
  items.length > MAX_CACHED_ITEMS ? items.slice(-MAX_CACHED_ITEMS) : items;

// Simplified state management - no custom hook to avoid re-render issues

function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // The native tab bar floats over content, so the feed pads its own tail.
  const tabBarInset = useNativeTabBarContentInset();
  const { profile, authenticated } = useProfile();
  const { unseenCount, refreshUnseenCount } = useActivity();
  const { requireMembership } = useMembership();
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
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const handledFeedRefreshRef = useRef<string | null>(null);
  const handledScreenshotFeedRef = useRef(false);
  const latestFeedRequestRef = useRef(0);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Direct state management to avoid re-render issues
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [nextCursor, setNextCursor] = useState<ReviewCursor | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [feedSource, setFeedSource] = useState<FeedSource>("club");
  // A different line every day of the week — the block is the first thing the
  // club says to you, and saying the same thing seven days running is how a
  // welcome stops being read.
  const greeting = getTiniTimeGreeting();
  // The greeting block is pinned over the list, not list content: a pull
  // past the top leaves it exactly where it is (only the feed rubber-bands
  // beneath it), while scrolling down still slides it away 1:1 with the
  // finger. Its measured height is both the list's top padding and the
  // collapse range, so the slide finishes exactly as the block clears.
  const [headerHeight, setHeaderHeight] = useState(insets.top + 96);
  const {
    isCollapsed,
    progress,
    onScroll: handleHeaderScroll,
  } = useCollapsibleHeader(headerHeight);
  const headerTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -headerHeight],
  });

  const profileId = profile?.id;
  const loadReviews = useCallback(
    // `silent` refreshes the data without the spinners — used by the
    // focus-staleness refresh so returning to the feed doesn't flash a
    // loading state over content that's already on screen.
    async (
      refresh = false,
      silent = false,
      sourceOverride: FeedSource = feedSource
    ) => {
      const source = isScreenshotFeed ? "club" : sourceOverride;

      // Prevent rapid successive calls
      const now = Date.now();
      if (!refresh && now - lastRefreshTime < REFRESH_THRESHOLD) {
        return;
      }

      const nextPage = refresh ? 0 : page + 1;

      // Set loading states. `refreshing` is deliberately not set here: it
      // belongs to the pull gesture alone (see onRefresh). Toggling the
      // native RefreshControl programmatically — or leaving it on when a
      // newer request superseded this one — wedged it: the header sat
      // shifted down and pulls stopped triggering entirely.
      if (refresh) {
        // Any in-flight pagination is superseded by a first-page refresh.
        setLoadingMore(false);
        if (!silent && page === 0) setLoading(true);
      } else {
        if (!hasMore) return;
        setLoadingMore(true);
      }

      const requestId = latestFeedRequestRef.current + 1;
      latestFeedRequestRef.current = requestId;
      const isCurrentRequest = () => requestId === latestFeedRequestRef.current;

      setError(null);

      try {
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

        const pageResult = await withTimeout(
          getReviewPage({
            viewerId: profileId,
            cursor: refresh ? null : nextCursor,
            userId: screenshotUserId,
            followedOnly: source === "people",
            limit: PAGE_SIZE,
            excludeBlocked: true,
          }),
          25_000
        );
        const reviewsDataFromDB = pageResult.reviews;

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
        setNextCursor(pageResult.nextCursor);
        setHasMore(pageResult.hasMore);
        setLastRefreshTime(now);

        if (refresh) setFirstLoadDone(true);
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

        if (refresh) setFirstLoadDone(true);
      } finally {
        // Cleared unconditionally — even for a superseded request — so a
        // spinner can never outlive the call that turned it on.
        if (refresh) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [
      profileId,
      page,
      nextCursor,
      hasMore,
      lastRefreshTime,
      isScreenshotFeed,
      feedSource,
    ]
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

  // The pull gesture is the only writer of `refreshing`, and it always
  // clears its own flag. Routing it through loadReviews let a superseded
  // request strand the native control mid-refresh, which both shifted the
  // header down permanently and stopped pull-to-refresh from ever firing
  // again.
  const refreshingRef = useRef(false);
  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // The refresh often resolves in under a frame or two of the release;
      // holding the indicator briefly is what makes the pull feel answered.
      await Promise.all([
        loadReviews(true, true),
        new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_SPINNER_MS)),
      ]);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [loadReviews]);

  // Under the native tab bar (SDK 57 / iOS 26), UIRefreshControl on this list
  // never fires onRefresh — the pull just rubber-bands. The scroll stream
  // still reports the negative offsets of that rubber-band, so the pull is
  // detected here in JS instead, and a floating spinner over the feed gives
  // the feedback the broken native control can't. (Its refreshing prop is no
  // help either: the inset it applies pinned the whole header down the screen
  // and its spinner drew invisibly.)
  const pullArmedRef = useRef(false);
  const handleFeedScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      if (y >= 0) {
        // The finger has to bring the list back to rest before another pull
        // can trigger — one refresh per gesture, exactly like the native
        // control.
        pullArmedRef.current = false;
      } else if (!pullArmedRef.current && y <= -PULL_REFRESH_DISTANCE) {
        pullArmedRef.current = true;
        void onRefresh();
      }
      handleHeaderScroll(event);
    },
    [handleHeaderScroll, onRefresh]
  );

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
    setNextCursor(null);
    setHasMore(true);
    setLoading(true);
    void loadReviews(true, true, nextSource);
    requestAnimationFrame(scrollToTop);
  }, [feedSource, loadReviews, requireMembership, scrollToTop]);

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
    authenticated,
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
  }, [
    loadingMore,
    colors.accent,
    styles.footerLoader,
    styles.footerLoaderText,
  ]);

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
          review.id === reviewId ? addReviewComment(review, newComment) : review
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
            ? deleteReviewComment(review, commentId)
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

  // Cleanup timeouts on unmount. The cleanup must read the refs at unmount
  // time — the timeouts are (re)armed long after this mount-only effect runs,
  // so copying `.current` into locals here would clear nothing.
  useEffect(() => {
    return () => {
      latestFeedRequestRef.current += 1;
      if (loadingTimeoutRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        clearTimeout(loadingTimeoutRef.current);
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

  // The same control renders on both headers in the same top-right slot, so
  // the crossfade reads as one pinned button while the green block scrolls
  // away beneath it.
  const headerActions: HeaderAction[] = profile
    ? [
        {
          icon: "heart-outline",
          badgeCount: unseenCount,
          onPress: () => router.push(routes.activity()),
          accessibilityLabel:
            unseenCount > 0
              ? `Activity, ${unseenCount} unread notifications`
              : "Activity",
        },
      ]
    : [
        {
          label: "Join",
          onPress: () => router.push(routes.auth()),
          accessibilityLabel: "Join the club",
        },
      ];

  return (
    <View style={styles.container}>
      {/* Variant B fades in on the same value that scrolls variant A away —
          the wordmark bar the public site header wears, over the feed. It
          speaks for the status bar in both states because it is the header
          that is always mounted at the top. */}
      <AppHeader
        variant="compact"
        compactContent={<Text style={styles.wordmark}>tini time club</Text>}
        compactContentCentered
        transparent
        actions={headerActions}
        progress={progress}
        collapsed={isCollapsed}
        overlay
        statusBar="light"
      />

      {/* Pinned over the list rather than rendered as list content: a pull
          past the top can no longer drag the greeting down the screen. The
          slide-away collapse survives as a translate driven by the same
          shared progress value the wordmark bar fades in on. */}
      <Animated.View
        style={[
          styles.pinnedHeader,
          { transform: [{ translateY: headerTranslate }] },
        ]}
        pointerEvents={isCollapsed ? "none" : "auto"}
        onLayout={(e) => {
          const measured = Math.round(e.nativeEvent.layout.height);
          if (measured > 0 && measured !== headerHeight) {
            setHeaderHeight(measured);
          }
        }}
      >
        <AppHeader
          variant="large"
          title={greeting.headline}
          meta={greeting.subline}
          actions={headerActions}
          statusBar="none"
        />
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id}
        onScroll={handleFeedScroll}
        scrollEventThrottle={16}
        onEndReached={onEndReached}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: tabBarInset,
        }}
        ListHeaderComponent={renderFeedHeader()}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={process.env.EXPO_OS === "android"}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={16}
        // Each card is ~1.3 screens tall (square photo + header + footer), so
        // 3 items is already several screens of runway; 10 meant mounting a
        // dozen screens of content and photo decodes before first paint.
        initialNumToRender={3}
        windowSize={7}
      />

      {/* Pull-to-refresh feedback. The native RefreshControl is broken under
          the native tab bar — its spinner never draws and it never fires — so
          the pull is detected from scroll offsets and answered with this chip
          floating under the wordmark bar. */}
      {refreshing ? (
        <View
          style={[styles.refreshChip, { top: headerHeight + 12 }]}
          pointerEvents="none"
        >
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : null}

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
                  ? addReviewComment(review, newComment)
                  : review
              )
            );
          }}
          onCommentDeleted={(reviewId, commentId) => {
            setReviews((prev) =>
              prev.map((review) =>
                review.id === reviewId
                  ? deleteReviewComment(review, commentId)
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
  // Above the list (which starts under it via padding), below the wordmark
  // bar's zIndex 10 so the crossfade keeps its stacking order.
  pinnedHeader: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  wordmark: {
    ...t.typography.wordmark,
    color: t.colors.onInk,
  },
  // A small floating plate, Instagram-style: the feed answers a pull with a
  // spinner over the content instead of the (broken) native inset spinner.
  refreshChip: {
    position: "absolute" as const,
    alignSelf: "center" as const,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.elevation.card,
  },
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

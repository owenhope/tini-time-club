import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Pressable, View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ReviewGrid from "@/components/ReviewGrid";
import { Review } from "@/types/types";
import { stripNameFromAddress, formatCityRegion } from "@/utils/helpers";
import { useProfile } from "@/context/profile-context";
import {
  Avatar,
  MartiniIcon,
  RatingPips,
  SectionHeader,
  Skeleton,
} from "@/components/shared";
import { useCollapsibleHeader } from "@/hooks/useCollapsibleHeader";
import AppHeader, { type HeaderAction } from "@/components/nav/AppHeader";
import { useGoBack } from "@/hooks/useAppNavigation";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { makeStyles, useTheme } from "@/theme";
import {
  getRegularsByLocation,
  type Regular,
} from "@/services/regularsService";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import { subscribeToReviewUpdates } from "@/utils/reviewEvents";
import { formatRating } from "@/utils/ratingUtils";
import RegularsSlider from "@/components/RegularsSlider";
import { isScreenshotSeed } from "@/utils/screenshotMode";
import { useLocationShareMenu } from "@/hooks/useLocationShareMenu";
import {
  addReviewComment,
  deleteReviewComment,
} from "@/utils/reviewCommentUpdates";
import { getReviewPage, type ReviewCursor } from "@/services/reviewFeedService";

// Helper function to format price level

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
  place_id?: string; // Google Places place_id
  phone_number?: string;
  website?: string;
  is_golden_glass?: boolean;
}

const Location = () => {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const { profile } = useProfile();
  const router = useRouter();
  const goBack = useGoBack();
  const [locationReviews, setLocationReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const reviewCursorRef = useRef<ReviewCursor | null>(null);
  const loadingMoreReviewsRef = useRef(false);
  const [regulars, setRegulars] = useState<Regular[]>([]);
  const [loadingRegulars, setLoadingRegulars] = useState<boolean>(true);
  const [regularsOpen, setRegularsOpen] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    null
  );
  const loadedLocationIdRef = useRef<string | null>(null);
  // One value, both halves of the crossfade: variant C fades out on it as it
  // scrolls away and variant B fades in on the same number.
  const {
    isCollapsed,
    progress,
    onScroll: handleScroll,
  } = useCollapsibleHeader();

  const params = useLocalSearchParams();
  const locationIdParam = params.place as string | undefined;
  const locationNameParam = params.name as string | undefined;
  const locationAddressParam = params.address as string | undefined;
  const shouldOpenRegularsForScreenshot = isScreenshotSeed(
    params.screenshotSeed as string | string[] | undefined,
    "place"
  );

  // Create a minimal location object if fetch fails but we have name from params
  const displayLocation = useMemo(() => {
    if (selectedLocation) {
      return selectedLocation;
    }
    // If location doesn't exist in DB but we have name from search, create minimal object
    if (locationNameParam) {
      return {
        id: locationIdParam || "",
        name: locationNameParam,
        address: locationAddressParam || "",
      } as LocationType;
    }
    return null;
  }, [
    selectedLocation,
    locationNameParam,
    locationAddressParam,
    locationIdParam,
  ]);
  const reviewLocationId = displayLocation?.id;
  const viewerId = profile?.id;

  const strippedAddress = displayLocation?.address
    ? stripNameFromAddress(displayLocation?.name ?? "", displayLocation.address)
    : null;

  // City and country place the venue for everyone; the street only places it
  // for someone already standing on it.
  const headerCityRegion = formatCityRegion(strippedAddress);
  const reviewCount = displayLocation?.total_ratings ?? 0;
  const reviewLabel = `${reviewCount} ${
    reviewCount === 1 ? "review" : "reviews"
  }`;
  const hasRating = displayLocation?.rating != null && reviewCount > 0;
  const regularPreview = regulars.slice(0, 3);
  const shareLocation = useLocationShareMenu(displayLocation);

  /**
   * The two controls the venue carries, in the order the drawing puts them.
   * They ride variant C's block while the hero is on screen and variant B's
   * bar once it has gone, so there is only ever one of each.
   */
  const headerActions = useMemo<HeaderAction[]>(() => {
    if (!displayLocation) return [];

    const actions: HeaderAction[] = [
      {
        icon: "paper-plane-outline",
        accessibilityLabel: `Share ${displayLocation.name}`,
        onPress: shareLocation,
      },
      {
        icon: "information-circle-outline",
        accessibilityLabel: "Location information",
        onPress: () =>
          router.push(
            routes.placeInfo({
              locationId: displayLocation.id,
              name: displayLocation.name,
              address: displayLocation.address ?? "",
              lat: displayLocation.lat ? displayLocation.lat.toString() : "",
              lon: displayLocation.lon ? displayLocation.lon.toString() : "",
              isGoldenGlass: displayLocation.is_golden_glass ? "1" : "0",
            })
          ),
      },
    ];

    if (displayLocation.lat && displayLocation.lon) {
      actions.push({
        icon: "location-outline",
        accessibilityLabel: "Show on map",
        // navigate, not push: this switches to Explore's Map view (or pops
        // back to it) instead of stacking a tab root with no back button.
        onPress: () =>
          router.navigate(
            routes.discover({
              view: "map",
              lat: displayLocation.lat!.toString(),
              lon: displayLocation.lon!.toString(),
              locationId: displayLocation.id,
            })
          ),
      });
    }

    return actions;
  }, [displayLocation, router, shareLocation]);

  const fetchSelectedLocation = useCallback(
    async (locationId: string) => {
      try {
        // The location_ratings view computes the averages and coordinates
        // server-side — the previous hand-rolled query downloaded every review
        // row for the location just to average two columns in JS.
        const data = await databaseService.getLocation(locationId, viewerId);

        const totalRatings = Number(data.total_ratings) || 0;
        const formattedLocation: LocationType = {
          id: String(data.id),
          name: data.name,
          address: data.address || undefined,
          lat: data.lat ?? undefined,
          lon: data.lon ?? undefined,
          // The view reports 0 for review-less locations; the UI wants
          // "not yet rated", which is the undefined case.
          rating: totalRatings > 0 ? Number(data.rating) : undefined,
          taste_avg: totalRatings > 0 ? Number(data.taste_avg) : undefined,
          presentation_avg:
            totalRatings > 0 ? Number(data.presentation_avg) : undefined,
          total_ratings: totalRatings,
          is_golden_glass: Boolean(data.is_golden_glass),
        };

        setSelectedLocation(formattedLocation);

        AnalyticService.capture("view_location", {
          locationId: formattedLocation.id,
          locationName: formattedLocation.name,
        });
      } catch {
        // .single() rejects when the location isn't in the DB yet — fall back
        // to the params-built minimal location via displayLocation.
        setSelectedLocation(null);
      }
    },
    [viewerId]
  );

  // Fetch the selected location from the "location_ratings" view
  useEffect(() => {
    if (locationIdParam) {
      void fetchSelectedLocation(locationIdParam);
    }
  }, [fetchSelectedLocation, locationIdParam]);

  useEffect(() => {
    if (!displayLocation?.id) return;

    let active = true;
    setLoadingRegulars(true);
    getRegularsByLocation([displayLocation.id])
      .then((grouped) => {
        if (active) {
          setRegulars(grouped.get(String(displayLocation.id)) ?? []);
        }
      })
      .catch((error) => {
        reportError("Error fetching location regulars:", error);
        if (active) setRegulars([]);
      })
      .finally(() => {
        if (active) setLoadingRegulars(false);
      });

    return () => {
      active = false;
    };
  }, [displayLocation?.id]);

  const handleCommentAdded = useCallback(
    (reviewId: string, newComment: any) => {
      setLocationReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId ? addReviewComment(review, newComment) : review
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
            ? deleteReviewComment(review, commentId)
            : review
        )
      );
    },
    []
  );

  const renderEmpty = useCallback(() => {
    if (locationReviews.length === 0 && displayLocation?.name) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Nobody&rsquo;s given a verdict here yet. Be first.
          </Text>
        </View>
      );
    }
    return null;
  }, [locationReviews.length, displayLocation?.name, styles]);

  // Shared function to load location reviews
  const loadLocationReviews = useCallback(
    async (isRefresh = false) => {
      if (!reviewLocationId) return;

      setLoadingReviews(true);
      try {
        const page = await getReviewPage({
          locationId: reviewLocationId,
          viewerId,
          excludeBlocked: true,
          limit: 24,
        });
        reviewCursorRef.current = page.nextCursor;
        setHasMoreReviews(page.hasMore);
        setLocationReviews(page.reviews);
      } catch (err) {
        reportError("Unexpected error while fetching location reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    },
    [reviewLocationId, viewerId]
  );

  const loadMoreLocationReviews = useCallback(async () => {
    if (
      !reviewLocationId ||
      !hasMoreReviews ||
      !reviewCursorRef.current ||
      loadingMoreReviewsRef.current
    ) {
      return;
    }

    loadingMoreReviewsRef.current = true;
    try {
      const page = await getReviewPage({
        locationId: reviewLocationId,
        viewerId,
        cursor: reviewCursorRef.current,
        excludeBlocked: true,
        limit: 24,
      });
      reviewCursorRef.current = page.nextCursor;
      setHasMoreReviews(page.hasMore);
      setLocationReviews((current) => {
        const loaded = new Set(current.map((review) => String(review.id)));
        return [
          ...current,
          ...page.reviews.filter((review) => !loaded.has(String(review.id))),
        ];
      });
    } catch (error) {
      reportError(
        "Unexpected error while loading more location reviews:",
        error
      );
    } finally {
      loadingMoreReviewsRef.current = false;
    }
  }, [hasMoreReviews, reviewLocationId, viewerId]);

  const onRefresh = useCallback(() => {
    if (displayLocation?.id) {
      loadedLocationIdRef.current = null; // Reset to allow reload
      loadLocationReviews(true);
    }
  }, [displayLocation?.id, loadLocationReviews]);

  useEffect(
    () =>
      subscribeToReviewUpdates(() => {
        void loadLocationReviews(true);
      }),
    [loadLocationReviews]
  );

  useEffect(() => {
    if (
      displayLocation?.id &&
      loadedLocationIdRef.current !== displayLocation.id
    ) {
      loadedLocationIdRef.current = displayLocation.id;

      // Load location reviews
      loadLocationReviews();
    }
  }, [displayLocation?.id, loadLocationReviews]);

  useEffect(() => {
    if (shouldOpenRegularsForScreenshot && regularPreview.length > 0) {
      setRegularsOpen(true);
    }
  }, [regularPreview.length, shouldOpenRegularsForScreenshot]);

  return (
    <View style={styles.container}>
      {/* Variant B, fading in on the same value that fades variant C out —
          one scroll, one animated value, both halves of the crossfade. */}
      <AppHeader
        variant="compact"
        title={displayLocation?.name ?? ""}
        onBack={goBack}
        actions={headerActions}
        ground="brand"
        progress={progress}
        collapsed={isCollapsed}
        overlay
        // This screen has two headers, so one of them has to speak for the
        // status bar: light glyphs over the purple block and its collapsed
        // purple bar.
        statusBar="light"
      />

      {/* Everything above the grid scrolls with it, the way the profile's
          does — the venue's identity shouldn't cost a permanent third of the
          screen once you're reading reviews. */}
      <ReviewGrid
        reviews={locationReviews}
        loading={loadingReviews}
        refreshing={loadingReviews}
        onRefresh={onRefresh}
        onEndReached={loadMoreLocationReviews}
        onScroll={handleScroll}
        emptyComponent={renderEmpty()}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
        contentTone={isDark ? "paper" : "surface"}
        tileLabel="reviewer"
        onEdit={(review) =>
          profile && String(profile.id) === String(review.user_id)
            ? router.push(routes.editReview(review.id))
            : undefined
        }
        header={
          <View>
            <View style={styles.venueHeader}>
              {/* Like profile, the venue identity and its stats live together
                  on the purple header ground. */}
              <AppHeader
                variant="media"
                ground="brand"
                title={displayLocation?.name ?? ""}
                titleAccessory={
                  displayLocation?.is_golden_glass ? (
                    <View accessible accessibilityLabel="Golden Glass">
                      <MartiniIcon size={22} color={colors.awardGold} filled />
                    </View>
                  ) : null
                }
                mediaTitleSize="compact"
                meta={headerCityRegion ?? undefined}
                onBack={goBack}
                actions={headerActions}
                progress={progress}
                collapsed={isCollapsed}
                statusBar="none"
              />

              <View style={styles.venueHeaderContent}>
                <View style={styles.venueStatsRow}>
                  <View
                    style={styles.metricBlock}
                    accessible
                    accessibilityRole="summary"
                    accessibilityLabel={
                      hasRating
                        ? `Overall ${formatRating(
                            displayLocation?.rating
                          )} from ${reviewLabel}`
                        : "Not yet rated"
                    }
                  >
                    <Text style={styles.venueEyebrow}>Overall</Text>
                    <View style={styles.venueRatingRow}>
                      <Text style={styles.venueScore}>
                        {hasRating
                          ? formatRating(displayLocation?.rating)
                          : "--"}
                      </Text>
                      {hasRating ? (
                        <View style={styles.venuePips}>
                          <RatingPips
                            value={displayLocation?.rating}
                            size={15}
                            accessibilityLabel=""
                          />
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.venueReviewCount}>{reviewLabel}</Text>
                  </View>

                  {loadingRegulars ? (
                    <View style={styles.regularsBlock}>
                      <Text style={styles.venueEyebrow}>Regulars</Text>
                      <View style={styles.regularAvatars}>
                        {[0, 1, 2].map((index) => (
                          <View
                            key={index}
                            style={[
                              styles.regularAvatar,
                              index > 0 && styles.regularAvatarOverlap,
                            ]}
                          >
                            <Skeleton circle height={32} />
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : regularPreview.length > 0 ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.regularsBlock,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setRegularsOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel={`Show regulars at ${displayLocation?.name}`}
                    >
                      <Text style={styles.venueEyebrow}>Regulars</Text>
                      <View
                        style={styles.regularAvatars}
                        accessibilityLabel={`${regularPreview.length} regulars`}
                      >
                        {regularPreview.map((regular, index) => (
                          <View
                            key={
                              regular.profile_id ??
                              `${regular.username}-${index}`
                            }
                            style={[
                              styles.regularAvatar,
                              index > 0 && styles.regularAvatarOverlap,
                            ]}
                          >
                            <Avatar
                              avatarPath={regular.avatar_url}
                              username={regular.username}
                              reviewCount={regular.profile_review_count}
                              size={32}
                              onInk
                            />
                          </View>
                        ))}
                      </View>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.reviewsIntro}>
              <SectionHeader
                eyebrow={
                  displayLocation?.total_ratings
                    ? `${displayLocation.total_ratings} ${
                        displayLocation.total_ratings === 1
                          ? "review"
                          : "reviews"
                      }`
                    : "The record"
                }
                title="Reviews"
              />
            </View>
          </View>
        }
      />
      {regularsOpen && regularPreview.length > 0 ? (
        <RegularsSlider
          regulars={regularPreview}
          locationName={displayLocation?.name}
          onClose={() => setRegularsOpen(false)}
        />
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.isDark ? t.colors.background : t.colors.surface,
  },
  venueHeader: {
    backgroundColor: t.colors.headerBrand,
  },
  venueHeaderContent: {
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.xl,
  },
  venueStatsRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.lg,
  },
  metricBlock: {
    gap: t.spacing.xs,
  },
  venueRatingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
  },
  venuePips: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 5,
    borderRadius: t.radius.sm,
    backgroundColor: "rgba(250,249,246,0.10)",
  },
  venueEyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.onHeaderBrand,
  },
  venueScore: {
    ...t.typography.display,
    color: t.colors.onHeaderBrand,
    fontVariant: ["tabular-nums"] as const,
  },
  venueReviewCount: {
    ...t.typography.mono,
    color: t.colors.onHeaderBrand,
  },
  regularsBlock: {
    alignItems: "flex-end" as const,
    gap: t.spacing.sm,
    paddingTop: 1,
  },
  pressed: {
    opacity: 0.65,
  },
  regularAvatars: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 38,
  },
  regularAvatar: {
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.headerBrand,
  },
  regularAvatarOverlap: {
    marginLeft: -8,
  },
  reviewsIntro: {
    backgroundColor: t.isDark ? t.colors.background : t.colors.surface,
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.lg - 2,
  },
  emptyContainer: {
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.xxl,
    gap: t.spacing.lg,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
  },
}));

export default Location;

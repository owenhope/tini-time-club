import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import ReviewItem from "@/components/ReviewItem";
import CommentsSlider from "@/components/CommentsSlider";
import { Ionicons } from "@expo/vector-icons";
import { Review } from "@/types/types";
import { stripNameFromAddress, formatCityRegion } from "@/utils/helpers";
import { useProfile } from "@/context/profile-context";
import { RatingSummary, Skeleton, StickerBadge } from "@/components/shared";
import useCollapsibleHeader, {
  COLLAPSE_RANGE,
} from "@/hooks/useCollapsibleHeader";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { HIT_SLOP, fonts, makeStyles, useTheme } from "@/theme";
import Regulars, { RegularsRailSkeleton } from "@/components/Regulars";
import {
  getRegularsByLocation,
  type Regular,
} from "@/services/regularsService";
import { reportError } from "@/utils/log";
import { routes, type ReviewLocationParams } from "@/utils/routes";

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
}

// Placeholder for a full-width review card (header, square photo, footer)
// while the review list loads, so content doesn't jump in from an empty list.
const ReviewCardSkeleton = () => {
  const styles = useStyles();
  return (
    <View>
      <View style={styles.skeletonCardHeader}>
        <Skeleton circle height={28} />
        <Skeleton width={120} height={12} />
      </View>
      <Skeleton width="100%" style={styles.skeletonCardImage} />
      <View style={styles.skeletonCardFooter}>
        <View style={styles.skeletonCardActions}>
          <Skeleton circle height={22} />
          <Skeleton circle height={22} />
        </View>
        <Skeleton width="90%" height={12} />
        <Skeleton width="60%" height={12} />
      </View>
    </View>
  );
};

const Location = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const router = useRouter();
  const [locationReviews, setLocationReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [regulars, setRegulars] = useState<Regular[]>([]);
  const [loadingRegulars, setLoadingRegulars] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    null
  );
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const loadedLocationIdRef = useRef<string | null>(null);
  const {
    isCollapsed,
    progress: headerProgress,
    onScroll: handleScroll,
  } = useCollapsibleHeader();
  // Measured natural heights of the two header states, so the container can
  // glide between them as the user scrolls.
  const [expandedHeaderH, setExpandedHeaderH] = useState(0);
  const [collapsedHeaderH, setCollapsedHeaderH] = useState(0);
  // Give short review lists enough scroll runway that the header can always
  // finish collapsing instead of resting half-faded.
  const [listViewportH, setListViewportH] = useState(0);

  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const locationIdParam = params.place as string | undefined;
  const locationNameParam = params.name as string | undefined;
  const locationAddressParam = params.address as string | undefined;

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

  const strippedAddress = displayLocation?.address
    ? stripNameFromAddress(displayLocation?.name ?? "", displayLocation.address)
    : null;

  const headerCityRegion = formatCityRegion(strippedAddress);

  // The hero splits the address the way the block reads it: the street line
  // runs under the name, the city rides the sticker.
  const heroStreet = strippedAddress?.split(",")[0]?.trim() || null;
  const heroCity = headerCityRegion.split(",")[0]?.trim() || null;

  // Update header with custom title and back button
  useEffect(() => {
    if (displayLocation?.name) {
      navigation.setOptions({
        // While the hero is on screen it carries the identity, so the bar
        // stays empty rather than setting the name twice; once the hero has
        // scrolled away the bar picks it back up.
        headerTitle: () =>
          isCollapsed ? (
            <View style={styles.headerTitleContainer}>
              <Text
                style={styles.headerTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayLocation.name}
              </Text>
              {headerCityRegion ? (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {headerCityRegion}
                </Text>
              ) : null}
            </View>
          ) : null,
        // Without this the custom title view is laid out in the space left
        // over by headerLeft and headerRight, which are different widths, so
        // it sits off-centre.
        headerTitleAlign: "center",
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() =>
                router.push(
                  routes.placeInfo({
                    locationId: displayLocation.id,
                    name: displayLocation.name,
                    address: displayLocation.address ?? "",
                    lat:
                      "lat" in displayLocation && displayLocation.lat
                        ? displayLocation.lat.toString()
                        : "",
                    lon:
                      "lon" in displayLocation && displayLocation.lon
                        ? displayLocation.lon.toString()
                        : "",
                  })
                )
              }
              style={styles.headerButton}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Location information"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={colors.onInk}
              />
            </TouchableOpacity>
            {"lat" in displayLocation &&
            "lon" in displayLocation &&
            displayLocation.lat &&
            displayLocation.lon ? (
              <TouchableOpacity
                onPress={() => {
                  // navigate, not push: this switches to the Places tab (or
                  // pops back to the map when already in that stack) instead
                  // of stacking a tab root with no back button.
                  router.navigate(
                    routes.places({
                      lat: displayLocation.lat!.toString(),
                      lon: displayLocation.lon!.toString(),
                      locationId: displayLocation.id,
                    })
                  );
                }}
                style={styles.headerButton}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Show on map"
              >
                <Ionicons name="location" size={24} color={colors.onInk} />
              </TouchableOpacity>
            ) : null}
          </View>
        ),
        // Continues the hero's deep green rather than sitting on it as a seam.
        headerStyle: {
          backgroundColor: colors.surfaceInkDeep,
        },
        headerShadowVisible: false,
        headerTintColor: colors.onInk,
      });
    }
  }, [
    displayLocation,
    headerCityRegion,
    isCollapsed,
    navigation,
    router,
    colors,
    styles,
  ]);

  // Fetch the selected location from the "location_ratings" view
  useEffect(() => {
    if (locationIdParam) {
      fetchSelectedLocation(locationIdParam);
    }
  }, [locationIdParam]);

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

  const fetchSelectedLocation = useCallback(async (locationId: string) => {
    try {
      // The location_ratings view computes the averages and coordinates
      // server-side — the previous hand-rolled query downloaded every review
      // row for the location just to average two columns in JS.
      const data = await databaseService.getLocation(locationId);

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
      };

      setSelectedLocation(formattedLocation);

      // Track view location event
      AnalyticService.capture("view_location", {
        locationId: formattedLocation.id,
        locationName: formattedLocation.name,
      });
    } catch (err) {
      // .single() rejects when the location isn't in the DB yet — fall back
      // to the params-built minimal location via displayLocation.
      setSelectedLocation(null);
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
    ({ item }: { item: Review }) => {
      const isOwnReview =
        profile && String(profile.id) === String(item.user_id);
      return (
        <ReviewItem
          review={item}
          canDelete={false}
          onDelete={undefined}
          onEdit={
            isOwnReview
              ? () => router.push(routes.editCaption(item.id))
              : undefined
          }
          onShowLikes={() => {}}
          onShowComments={handleShowComments}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
        />
      );
    },
    [
      handleShowComments,
      handleCommentAdded,
      handleCommentDeleted,
      profile,
      router,
    ]
  );

  const renderEmpty = useCallback(() => {
    if (loadingReviews) {
      return <ReviewCardSkeleton />;
    }
    if (locationReviews.length === 0 && displayLocation?.name) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Nobody&rsquo;s given a verdict here yet. Be first.
          </Text>
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={() => {
              // Navigate to review page with location pre-filled
              const locationParams: ReviewLocationParams = {
                locationName: displayLocation.name,
                locationAddress: displayLocation.address || "",
              };

              // Add coordinates if available
              if (
                displayLocation &&
                "lat" in displayLocation &&
                "lon" in displayLocation &&
                displayLocation.lat &&
                displayLocation.lon
              ) {
                locationParams.locationLat = displayLocation.lat.toString();
                locationParams.locationLon = displayLocation.lon.toString();
              }

              router.push(routes.review(locationParams));
            }}
          >
            <Text style={styles.addReviewButtonText}>Add Review</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  }, [
    loadingReviews,
    locationReviews.length,
    displayLocation?.name,
    displayLocation?.address,
    displayLocation?.id,
    router,
  ]);

  // Shared function to load location reviews
  const loadLocationReviews = useCallback(
    async (isRefresh = false) => {
      if (!displayLocation?.id) return;

      setLoadingReviews(true);
      try {
        const reviewsData = await databaseService.getReviews({
          locationId: displayLocation.id,
          currentUserId: profile?.id,
          excludeBlocked: true,
          forceRefresh: isRefresh,
        });

        // getReviews returns image_url already hydrated to a signed URL.
        setLocationReviews(reviewsData);
      } catch (err) {
        reportError("Unexpected error while fetching location reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    },
    [displayLocation?.id, profile?.id]
  );

  const onRefresh = useCallback(() => {
    if (displayLocation?.id) {
      loadedLocationIdRef.current = null; // Reset to allow reload
      loadLocationReviews(true);
    }
  }, [displayLocation?.id, loadLocationReviews]);

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* The header glides between its full and compact form at the speed the
          user scrolls: the container height interpolates between the two
          measured states while their contents crossfade. */}
      <Animated.View
        style={[
          styles.header,
          expandedHeaderH > 0 && collapsedHeaderH > 0
            ? {
                height: headerProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [expandedHeaderH, collapsedHeaderH],
                }),
                overflow: "hidden" as const,
              }
            : null,
        ]}
      >
        <Animated.View
          onLayout={(e) => setExpandedHeaderH(e.nativeEvent.layout.height)}
          pointerEvents={isCollapsed ? "none" : "auto"}
          style={[
            styles.expandedHeader,
            {
              opacity: headerProgress.interpolate({
                inputRange: [0, 0.6],
                outputRange: [1, 0],
                extrapolate: "clamp",
              }),
            },
          ]}
        >
          <>
            {/* `locations` has no image column, and borrowing a member's
                review photo would make the venue look like it endorsed one
                person's Tuesday. The brand stands in instead: deep green, the
                name in the display cut, the sticker pinned at a tilt. A venue
                photo, if one ever lands, drops in behind this with the
                existing scrim and nothing moves. */}
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <StickerBadge
                  topText="On the list"
                  bottomText={heroCity}
                  size={88}
                  tilt={-9}
                  style={styles.heroSticker}
                />
              </View>
              <View style={styles.heroIdentity}>
                <Text
                  style={[
                    styles.heroName,
                    // A long name wraps to a second line and drops a step
                    // rather than growing the block.
                    (displayLocation?.name?.length ?? 0) > 22 &&
                      styles.heroNameLong,
                  ]}
                  numberOfLines={2}
                >
                  {displayLocation?.name}
                </Text>
                {heroStreet ? (
                  <Text style={styles.heroAddress} numberOfLines={1}>
                    {heroStreet}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Full-width rows rather than three columns competing for 402pt:
                the score and each meter get the whole gutter-to-gutter width,
                and the regulars become a rail underneath. */}
            <View style={styles.overview}>
              <RatingSummary
                variant="headline"
                overall={displayLocation?.rating}
                taste={displayLocation?.taste_avg}
                presentation={displayLocation?.presentation_avg}
                reviewCount={displayLocation?.total_ratings ?? 0}
                tone="onImage"
              />

              {loadingRegulars ? (
                <View style={styles.regularsRail}>
                  <RegularsRailSkeleton onInk />
                </View>
              ) : regulars.length > 0 ? (
                <View style={styles.regularsRail}>
                  <Regulars regulars={regulars} variant="rail" onInk />
                </View>
              ) : null}
            </View>
          </>
        </Animated.View>

        {/* Scrolled: the nav bar still shows the name, so the body keeps only
            the score and count and hands the rest of the screen to reviews. */}
        <Animated.View
          onLayout={(e) => setCollapsedHeaderH(e.nativeEvent.layout.height)}
          pointerEvents={isCollapsed ? "auto" : "none"}
          style={[
            styles.collapsedOverlay,
            {
              opacity: headerProgress.interpolate({
                inputRange: [0.4, 1],
                outputRange: [0, 1],
                extrapolate: "clamp",
              }),
            },
          ]}
        >
          <View style={styles.collapsedRow}>
            <RatingSummary
              variant="compact"
              overall={displayLocation?.rating}
              reviewCount={displayLocation?.total_ratings ?? 0}
              compactDecorated={false}
            />
            {regulars.length > 0 ? (
              <View style={styles.collapsedRegulars}>
                <Regulars
                  regulars={regulars}
                  variant="compact"
                  showLabel={false}
                />
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>

      <View
        style={styles.reviewsContainer}
        onLayout={(e) => setListViewportH(e.nativeEvent.layout.height)}
      >
        <FlatList
          data={locationReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.gridContent,
            listViewportH > 0
              ? {
                  // The list's viewport grows by whatever the header gives
                  // back as it collapses, so the runway has to cover that as
                  // well as the collapse distance — otherwise a short list
                  // runs out of scroll and the header rests half-faded.
                  minHeight:
                    listViewportH +
                    COLLAPSE_RANGE +
                    Math.max(0, expandedHeaderH - collapsedHeaderH),
                }
              : null,
          ]}
          ListEmptyComponent={renderEmpty}
          // Full-bleed photo cards: without windowing config the defaults
          // mount 10 cards up front and keep ~21 screens of them alive.
          removeClippedSubviews={true}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loadingReviews}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
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

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    backgroundColor: t.colors.surfaceInk,
  },
  expandedHeader: {
    paddingBottom: t.spacing.md,
    gap: t.spacing.lg,
  },
  // Fixed height: the name changes size, the block doesn't.
  hero: {
    height: 230,
    backgroundColor: t.colors.surfaceInkDeep,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.lg + 2,
    justifyContent: "space-between" as const,
  },
  heroTop: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
  },
  heroSticker: {
    marginTop: -4,
  },
  heroIdentity: {
    gap: t.spacing.sm,
  },
  heroName: {
    ...t.typography.display,
    lineHeight: 31,
    color: t.colors.onInk,
  },
  heroNameLong: {
    fontSize: 28,
    lineHeight: 26,
  },
  heroAddress: {
    ...t.typography.mono,
    color: t.colors.accentOnImage,
  },
  collapsedOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    justifyContent: "center" as const,
  },
  overview: {
    paddingHorizontal: t.spacing.gutter,
    gap: t.spacing.lg,
  },
  regularsRail: {
    borderTopWidth: 1,
    borderTopColor: t.colors.ratingTrackOnInk,
    paddingTop: t.spacing.lg - 2,
  },
  collapsedRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.xs,
  },
  collapsedRegulars: {
    flexShrink: 0,
    alignItems: "flex-end" as const,
  },
  reviewsContainer: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: t.spacing.xl - 4,
  },
  emptyContainer: {
    alignItems: "center" as const,
    padding: t.spacing.xl - 4,
    gap: t.spacing.lg,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
  },
  addReviewButton: {
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xl,
    paddingVertical: t.spacing.md,
    marginTop: t.spacing.sm,
  },
  addReviewButtonText: {
    ...t.typography.bodyStrong,
    color: t.colors.onAccent,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 2,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  headerTitleContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    ...t.typography.heading,
    color: t.colors.onInk,
    flexShrink: 1,
  },
  headerSubtitle: {
    ...t.typography.caption,
    color: t.colors.onInk,
    opacity: 0.8,
    flexShrink: 1,
  },
  skeletonCardHeader: {
    paddingHorizontal: 10,
    paddingVertical: t.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    backgroundColor: t.colors.surface,
  },
  skeletonCardImage: {
    height: "auto" as const,
    aspectRatio: 1,
    borderRadius: 0,
  },
  skeletonCardFooter: {
    padding: 10,
    gap: t.spacing.sm,
    backgroundColor: t.colors.surface,
  },
  skeletonCardActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
}));

export default Location;

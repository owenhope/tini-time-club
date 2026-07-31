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
import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import ReviewItem from "@/components/ReviewItem";
import CommentsSlider from "@/components/CommentsSlider";
import { Ionicons } from "@expo/vector-icons";
import { Review } from "@/types/types";
import { stripNameFromAddress, formatCityRegion } from "@/utils/helpers";
import { useProfile } from "@/context/profile-context";
import imageCache from "@/utils/imageCache";
import { RatingSummary, Skeleton } from "@/components/shared";
import useCollapsibleHeader, {
  COLLAPSE_RANGE,
} from "@/hooks/useCollapsibleHeader";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { HIT_SLOP, makeStyles, useTheme } from "@/theme";
import Regulars, { RegularsSkeleton } from "@/components/Regulars";
import {
  getRegularsByLocation,
  type Regular,
} from "@/services/regularsService";

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

  const headerCityRegion = formatCityRegion(
    displayLocation?.address
      ? stripNameFromAddress(
          displayLocation?.name ?? "",
          displayLocation.address
        )
      : null
  );

  // Update header with custom title and back button
  useEffect(() => {
    if (displayLocation?.name) {
      navigation.setOptions({
        // The nav bar carries the identity: name over city/region. The body
        // therefore doesn't repeat the name — that duplication was the whole
        // problem — and the otherwise-empty bar earns its space.
        headerTitle: () => (
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
        ),
        // Without this the custom title view is laid out in the space left
        // over by headerLeft and headerRight, which are different widths, so
        // it sits off-centre.
        headerTitleAlign: "center",
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/place-info",
                  params: {
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
                  },
                })
              }
              style={styles.headerButton}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Location information"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={colors.text}
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
                  router.navigate({
                    pathname: "/places",
                    params: {
                      lat: displayLocation.lat!.toString(),
                      lon: displayLocation.lon!.toString(),
                      locationId: displayLocation.id,
                    },
                  });
                }}
                style={styles.headerButton}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Show on map"
              >
                <Ionicons name="location" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : null}
          </View>
        ),
      });
    }
  }, [displayLocation, headerCityRegion, navigation, router, colors, styles]);

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
        console.error("Error fetching location regulars:", error);
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
      // Query locations table directly to include locations with no reviews
      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .select(
          `
          id,
          name,
          address,
          location,
          reviews!reviews_location_fkey(
            taste,
            presentation,
            state
          )
        `
        )
        .eq("id", locationId)
        .maybeSingle();

      if (locationError) {
        console.error("Error fetching selected location:", locationError);
        setSelectedLocation(null);
        return;
      }

      if (!locationData) {
        // Location doesn't exist in DB, set to null so displayLocation can use params
        setSelectedLocation(null);
        return;
      }

      // Filter active reviews
      const activeReviews = (locationData.reviews || []).filter(
        (r: any) => r.state === 1
      );
      const totalRatings = activeReviews.length;

      // Calculate averages if there are reviews
      let rating: number | undefined;
      let taste_avg: number | undefined;
      let presentation_avg: number | undefined;

      if (totalRatings > 0) {
        const tasteSum = activeReviews.reduce(
          (sum: number, r: any) => sum + (r.taste || 0),
          0
        );
        const presentationSum = activeReviews.reduce(
          (sum: number, r: any) => sum + (r.presentation || 0),
          0
        );

        taste_avg = tasteSum / totalRatings;
        presentation_avg = presentationSum / totalRatings;
        rating = (taste_avg + presentation_avg) / 2;
      }

      // Extract coordinates from PostGIS POINT if available
      let lat: number | undefined;
      let lon: number | undefined;
      if (locationData.location) {
        // PostGIS POINT format: "POINT(longitude latitude)"
        const match = locationData.location.match(
          /POINT\(([\d.-]+)\s+([\d.-]+)\)/
        );
        if (match) {
          lon = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      }

      // Format location data to match LocationType interface
      const formattedLocation: LocationType = {
        id: locationData.id,
        name: locationData.name,
        address: locationData.address || undefined,
        lat,
        lon,
        rating,
        taste_avg,
        presentation_avg,
        total_ratings: totalRatings,
      };

      setSelectedLocation(formattedLocation);

      // Track view location event
      AnalyticService.capture("view_location", {
        locationId: formattedLocation.id,
        locationName: formattedLocation.name,
      });
    } catch (err) {
      console.error("Unexpected error fetching location:", err);
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
              ? () => router.push(`/edit-caption?reviewId=${item.id}`)
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
          <Text style={styles.emptyText}>No reviews yet.</Text>
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={() => {
              // Navigate to review page with location pre-filled
              const locationParams: any = {
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

              router.push({
                pathname: "/review",
                params: locationParams,
              });
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
  const loadLocationReviews = useCallback(async () => {
    if (!displayLocation?.id) return;

    setLoadingReviews(true);
    try {
      const reviewsData = await databaseService.getReviews({
        locationId: displayLocation.id,
        currentUserId: profile?.id,
        excludeBlocked: true,
      });

      // Get image URLs using cache
      const imagePaths = reviewsData.map((review: any) => review.image_url);
      const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

      const reviewsWithFullUrl = reviewsData.map((review: any) => ({
        ...review,
        image_url: imageUrls[review.image_url] || review.image_url,
      }));
      setLocationReviews(reviewsWithFullUrl);
    } catch (err) {
      console.error("Unexpected error while fetching location reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  }, [displayLocation?.id, profile?.id]);

  const onRefresh = useCallback(() => {
    if (displayLocation?.id) {
      loadedLocationIdRef.current = null; // Reset to allow reload
      loadLocationReviews();
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
            <View style={styles.overview}>
              <View style={styles.overviewColumns}>
                <View style={styles.ratingBlock}>
                  <RatingSummary
                    overall={displayLocation?.rating}
                    taste={displayLocation?.taste_avg}
                    presentation={displayLocation?.presentation_avg}
                    reviewCount={displayLocation?.total_ratings ?? 0}
                    countPlacement="score"
                    showOverallMeta={false}
                    showOverallHeading
                    overallPlacement="right"
                    breakdownLayout="stacked"
                  />
                </View>

                {loadingRegulars ? (
                  <View style={styles.regularsBlock}>
                    <RegularsSkeleton />
                  </View>
                ) : regulars.length > 0 ? (
                  <View style={styles.regularsBlock}>
                    <Regulars regulars={regulars} variant="dense" />
                  </View>
                ) : null}
              </View>
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
              ? { minHeight: listViewportH + COLLAPSE_RANGE }
              : null,
          ]}
          ListEmptyComponent={renderEmpty}
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
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  expandedHeader: {
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.md,
    gap: t.spacing.lg,
  },
  collapsedOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    justifyContent: "center" as const,
  },
  overview: {
    paddingHorizontal: t.spacing.lg,
  },
  overviewColumns: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.xl,
  },
  ratingBlock: {
    flex: 1,
    minWidth: 0,
  },
  regularsBlock: {
    width: "42%" as const,
    minWidth: 128,
    maxWidth: 168,
  },
  collapsible: {
    gap: t.spacing.xs,
  },
  collapsedRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.xs,
  },
  collapsedName: {
    ...t.typography.heading,
    color: t.colors.text,
    flexShrink: 1,
  },
  collapsedRegulars: {
    flexShrink: 0,
    alignItems: "flex-end" as const,
  },
  contactLinks: {
    marginHorizontal: t.spacing.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.sm,
  },
  contactLinkHit: {
    minHeight: 32,
    justifyContent: "center" as const,
  },
  contactLink: {
    ...t.typography.body,
    color: t.colors.accent,
  },
  disclosure: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    minHeight: 36,
    paddingHorizontal: t.spacing.lg,
  },
  disclosurePressed: {
    opacity: 0.6,
  },
  disclosureLabel: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  actions: {
    paddingHorizontal: t.spacing.lg,
  },
  profileHeader: {
    padding: t.spacing.lg,
  },
  addressRow: {
    paddingTop: t.spacing.sm,
  },
  addressContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
  },
  nameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: t.spacing.xs,
  },
  locationName: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: t.colors.text,
    marginBottom: t.spacing.xs,
  },
  priceLevel: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: t.colors.textSecondary,
    marginLeft: t.spacing.sm,
  },
  locationAddress: {
    fontSize: 15,
    color: t.colors.text,
    lineHeight: 20,
    textAlign: "left" as const,
  },
  contactInfo: {
    flexDirection: "row" as const,
    justifyContent: "flex-start" as const,
    gap: t.spacing.sm,
    flexWrap: "wrap" as const,
  },
  contactButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.sm,
    paddingVertical: t.spacing.sm + 2,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.xl - 4,
    backgroundColor: t.colors.accent,
  },
  contactText: {
    fontSize: 13,
    color: t.colors.onAccent,
    fontWeight: "600" as const,
  },
  loadingText: {
    fontSize: 12,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    marginTop: t.spacing.xs,
    fontStyle: "italic" as const,
  },
  tagsContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
  },
  loadingTextInline: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    paddingHorizontal: t.spacing.lg,
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
    fontSize: 15,
    color: t.colors.textSecondary,
  },
  addReviewButton: {
    backgroundColor: t.colors.accent,
    paddingHorizontal: t.spacing.xl,
    paddingVertical: t.spacing.md,
    borderRadius: 25,
    marginTop: t.spacing.sm,
  },
  addReviewButtonText: {
    color: t.colors.onAccent,
    fontSize: 15,
    fontWeight: "600" as const,
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
    color: t.colors.text,
    flexShrink: 1,
  },
  headerSubtitle: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
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

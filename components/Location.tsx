import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import CommentsSlider from "@/components/CommentsSlider";
import ReviewGrid from "@/components/ReviewGrid";
import { Ionicons } from "@expo/vector-icons";
import { Review } from "@/types/types";
import { stripNameFromAddress, formatCityRegion } from "@/utils/helpers";
import { useProfile } from "@/context/profile-context";
import { RatingSummary, SectionHeader } from "@/components/shared";
import useCollapsibleHeader from "@/hooks/useCollapsibleHeader";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { HIT_SLOP, makeStyles, useTheme } from "@/theme";
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
  // The header scrolls away with the grid, so the hook is only here to tell
  // the nav bar when the hero has gone and it needs to carry the name.
  const { isCollapsed, onScroll: handleScroll } = useCollapsibleHeader();

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

  // City and country place the venue for everyone; the street only places it
  // for someone already standing on it.
  const headerCityRegion = formatCityRegion(strippedAddress);

  // Update header with custom title and back button
  useEffect(() => {
    if (displayLocation?.name) {
      navigation.setOptions({
        // While the hero is on screen it carries the identity, so the bar
        // stays empty rather than setting the name twice; once the hero has
        // scrolled away the bar picks it back up.
        // Hidden rather than absent: an empty headerTitle falls back to the
        // route name, and "places/[place]" is not a venue.
        headerTitle: () => (
          <View
            style={[
              styles.headerTitleContainer,
              !isCollapsed && styles.headerTitleHidden,
            ]}
          >
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

      {/* Everything above the grid scrolls with it, the way the profile's
          does — the venue's identity shouldn't cost a permanent third of the
          screen once you're reading reviews. */}
      <ReviewGrid
        reviews={locationReviews}
        loading={loadingReviews}
        refreshing={loadingReviews}
        onRefresh={onRefresh}
        onScroll={handleScroll}
        emptyComponent={renderEmpty()}
        onShowComments={handleShowComments}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
        onEdit={(review) =>
          profile && String(profile.id) === String(review.user_id)
            ? router.push(routes.editCaption(review.id))
            : undefined
        }
        header={
          <View>
            {/* `locations` has no image column, and borrowing a member's
                review photo would make the venue look like it endorsed one
                person's Tuesday. The brand stands in instead: deep green, the
                name in the display cut, the sticker pinned at a tilt. A venue
                photo, if one ever lands, drops in behind this with the
                existing scrim and nothing moves. */}
            <View style={styles.hero}>
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
                {headerCityRegion ? (
                  <Text style={styles.heroAddress} numberOfLines={1}>
                    {headerCityRegion}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.body}>
              {/* The place's aggregates are the screen's one flat-colour
                  block: full-width rows inside it rather than three columns
                  competing for 402pt, and the regulars as a rail underneath. */}
              <View style={styles.overviewCard}>
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

              <SectionHeader
                eyebrow={
                  displayLocation?.total_ratings
                    ? `${displayLocation.total_ratings} ${
                        displayLocation.total_ratings === 1
                          ? "verdict"
                          : "verdicts"
                      }`
                    : "The record"
                }
                title="Reviews"
              />
            </View>
          </View>
        }
      />

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
  body: {
    padding: t.spacing.lg,
    paddingHorizontal: t.spacing.gutter,
    gap: t.spacing.lg - 2,
  },
  // Soft-square, inset on paper — the block is a card on the page, not a
  // band across it.
  overviewCard: {
    backgroundColor: t.colors.surfaceInk,
    borderRadius: t.radius.card,
    paddingHorizontal: t.spacing.lg + 2,
    paddingVertical: t.spacing.lg,
    gap: t.spacing.lg,
  },
  // Fixed height: the name changes size, the block doesn't. Short enough
  // that the aggregates are on screen with it.
  hero: {
    height: 148,
    backgroundColor: t.colors.surfaceInkDeep,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.lg + 2,
    justifyContent: "flex-end" as const,
  },
  heroIdentity: {
    gap: t.spacing.sm,
  },
  // Leading is never below the point size: RN clips the line box rather than
  // letting the glyphs overhang it.
  heroName: {
    ...t.typography.display,
    lineHeight: 36,
    color: t.colors.onInk,
  },
  heroNameLong: {
    fontSize: 28,
    lineHeight: 30,
  },
  heroAddress: {
    ...t.typography.mono,
    color: t.colors.accentOnImage,
  },
  regularsRail: {
    borderTopWidth: 1,
    borderTopColor: t.colors.ratingTrackOnInk,
    paddingTop: t.spacing.lg - 2,
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
  headerTitleHidden: {
    opacity: 0,
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
}));

export default Location;

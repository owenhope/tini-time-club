import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ReviewGrid from "@/components/ReviewGrid";
import { Review } from "@/types/types";
import { stripNameFromAddress, formatCityRegion } from "@/utils/helpers";
import { useProfile } from "@/context/profile-context";
import { RatingSummary, SectionHeader } from "@/components/shared";
import useCollapsibleHeader from "@/hooks/useCollapsibleHeader";
import AppHeader, { type HeaderAction } from "@/components/nav/AppHeader";
import { useGoBack } from "@/hooks/useAppNavigation";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { makeStyles } from "@/theme";
import Regulars, { RegularsRailSkeleton } from "@/components/Regulars";
import {
  getRegularsByLocation,
  type Regular,
} from "@/services/regularsService";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";

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
  const { profile } = useProfile();
  const router = useRouter();
  const goBack = useGoBack();
  const [locationReviews, setLocationReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [regulars, setRegulars] = useState<Regular[]>([]);
  const [loadingRegulars, setLoadingRegulars] = useState<boolean>(true);
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

  /**
   * The two controls the venue carries, in the order the drawing puts them.
   * They ride variant C's block while the hero is on screen and variant B's
   * bar once it has gone, so there is only ever one of each.
   */
  const headerActions = useMemo<HeaderAction[]>(() => {
    if (!displayLocation) return [];

    const actions: HeaderAction[] = [
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
            })
          ),
      },
    ];

    if (displayLocation.lat && displayLocation.lon) {
      actions.push({
        icon: "location",
        accessibilityLabel: "Show on map",
        // navigate, not push: this switches to the Places tab (or pops back to
        // the map when already in that stack) instead of stacking a tab root
        // with no back button.
        onPress: () =>
          router.navigate(
            routes.places({
              lat: displayLocation.lat!.toString(),
              lon: displayLocation.lon!.toString(),
              locationId: displayLocation.id,
            })
          ),
      });
    }

    return actions;
  }, [displayLocation, router]);

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
    } catch {
      // .single() rejects when the location isn't in the DB yet — fall back
      // to the params-built minimal location via displayLocation.
      setSelectedLocation(null);
    }
  }, []);

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
      {/* Variant B, fading in on the same value that fades variant C out —
          one scroll, one animated value, both halves of the crossfade. */}
      <AppHeader
        variant="compact"
        title={displayLocation?.name ?? ""}
        onBack={goBack}
        actions={headerActions}
        progress={progress}
        collapsed={isCollapsed}
        overlay
        // This screen has two headers, so one of them has to speak for the
        // status bar: green while the block is up there, the theme's own once
        // the paper bar has taken over.
        statusBar={isCollapsed ? "auto" : "light"}
      />

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
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
        onEdit={(review) =>
          profile && String(profile.id) === String(review.user_id)
            ? router.push(routes.editCaption(review.id))
            : undefined
        }
        header={
          <View>
            {/* Variant C. `locations` has no image column yet, and borrowing a
                member's review photo would make the venue look like it
                endorsed one person's Tuesday — so the ground is the brand's
                deep green until a venue photo lands, at which point it drops
                in behind the same scrim and nothing else moves. */}
            <AppHeader
              variant="media"
              title={displayLocation?.name ?? ""}
              meta={headerCityRegion ?? undefined}
              onBack={goBack}
              actions={headerActions}
              progress={progress}
              collapsed={isCollapsed}
              statusBar="none"
            />

            <View style={styles.body}>
              {/* The place's aggregates are the screen's one flat-colour
                  block: full-width rows inside it rather than three columns
                  competing for 402pt, and the regulars as a rail underneath. */}
              <View style={styles.overviewCard}>
                <RatingSummary
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
}));

export default Location;

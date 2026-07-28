import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import ReviewItem from "@/components/ReviewItem";
import CommentsSlider from "@/components/CommentsSlider";
import { Ionicons } from "@expo/vector-icons";
import { Review } from "@/types/types";
import { stripNameFromAddress } from "@/utils/helpers";
import { useProfile } from "@/context/profile-context";
import imageCache from "@/utils/imageCache";
import RatingCircles from "@/components/RatingCircles";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import {
  getPlaceDetailsByNameAndAddress,
  getRelevantPlaceTypes,
} from "@/utils/locationUtils";
import { Linking } from "react-native";
import Tag from "@/components/Tag";
import { makeStyles, useTheme } from "@/theme";

// Helper function to format price level
const getPriceLevelText = (priceLevel: number): string => {
  switch (priceLevel) {
    case 0:
      return "Free";
    case 1:
      return "$";
    case 2:
      return "$$";
    case 3:
      return "$$$";
    case 4:
      return "$$$$";
    default:
      return "";
  }
};

// Constants
const DIMENSIONS = {
  avatar: 100,
  ratingCircle: 50,
} as const;

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
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [locationReviews, setLocationReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingImage, setLoadingImage] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    null
  );
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const loadedLocationIdRef = useRef<string | null>(null);
  const [placeDetails, setPlaceDetails] = useState<{
    phoneNumber?: string;
    website?: string;
    priceLevel?: number;
    types?: string[];
  } | null>(null);
  const [loadingPlaceDetails, setLoadingPlaceDetails] = useState(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const contactInfoOpacity = useRef(new Animated.Value(1)).current;
  const contactInfoHeight = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    // Animate opacity with native driver
    Animated.timing(contactInfoOpacity, {
      toValue: isScrolled ? 0 : 1,
      duration: isScrolled ? 1 : 200,
      useNativeDriver: true,
    }).start();

    // Animate height separately without native driver (to avoid conflicts)
    Animated.timing(contactInfoHeight, {
      toValue: isScrolled ? 0 : 300,
      duration: isScrolled ? 200 : 300,
      useNativeDriver: false,
    }).start();
  }, [isScrolled]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const shouldBeScrolled = offsetY > 30;
        if (shouldBeScrolled !== isScrolled) {
          setIsScrolled(shouldBeScrolled);
        }
      },
    }
  );

  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const locationIdParam = params.location as string | undefined;
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

  // Update header with custom title and back button
  useEffect(() => {
    if (displayLocation?.name) {
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={false}
            >
              {displayLocation.name}
            </Text>
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButtonLeft}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ),
        headerRight: () => {
          if (
            displayLocation &&
            "lat" in displayLocation &&
            "lon" in displayLocation &&
            displayLocation.lat &&
            displayLocation.lon
          ) {
            return (
              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: "/(tabs)/locations",
                    params: {
                      lat: displayLocation.lat!.toString(),
                      lon: displayLocation.lon!.toString(),
                      locationId: displayLocation.id,
                    },
                  });
                }}
                style={styles.headerButtonRight}
              >
                <Ionicons name="location" size={24} color={colors.text} />
              </TouchableOpacity>
            );
          }
          return null;
        },
      });
    }
  }, [displayLocation, navigation, router, colors, styles]);

  // Fetch the selected location from the "location_ratings" view
  useEffect(() => {
    setLocationImage(null);
    setPlaceDetails(null);
    if (locationIdParam) {
      fetchSelectedLocation(locationIdParam);
    }
  }, [locationIdParam]);

  // Fetch place details (phone, website) when location is loaded
  useEffect(() => {
    if (displayLocation?.name) {
      setLoadingPlaceDetails(true);
      getPlaceDetailsByNameAndAddress(
        displayLocation.name,
        displayLocation.address
      )
        .then((details) => {
          if (details) {
            setPlaceDetails({
              phoneNumber: details.phoneNumber,
              website: details.website,
              priceLevel: details.priceLevel,
              types: details.types,
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching place details:", error);
        })
        .finally(() => {
          setLoadingPlaceDetails(false);
        });
    }
  }, [displayLocation?.name, displayLocation?.address]);

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

  const loadLocationImage = useCallback(async (locationId?: string) => {
    setLoadingImage(true);
    if (!locationId) {
      setLoadingImage(false);
      return;
    }
    try {
      const imageUrl = await imageCache.getLocationImage(locationId);
      setLocationImage(imageUrl);
    } catch (err) {
      console.error("Unexpected error while downloading location image:", err);
      setLocationImage(null);
    } finally {
      setLoadingImage(false);
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
              ? () => router.push(`/profile/edit-caption?reviewId=${item.id}`)
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
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.emptyText}>Loading reviews...</Text>
        </View>
      );
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
                pathname: "/(tabs)/review",
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

      // Load location image
      loadLocationImage(displayLocation.id);

      // Load location reviews
      loadLocationReviews();
    }
  }, [displayLocation?.id, loadLocationImage, loadLocationReviews]);

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <RatingCircles
          location={displayLocation || {}}
          circleSize={DIMENSIONS.ratingCircle}
        />
        <View style={styles.addressRow}>
          {displayLocation?.name && (
            <Text style={styles.locationName}>{displayLocation.name}</Text>
          )}
          {displayLocation?.address && (
            <TouchableOpacity
              onPress={() => {
                const address = stripNameFromAddress(
                  displayLocation?.name ?? "",
                  displayLocation?.address ?? ""
                );
                // Use coordinates if available, otherwise use address
                if (displayLocation?.lat && displayLocation?.lon) {
                  // Open in maps with coordinates (works on both iOS and Android)
                  Linking.openURL(
                    `https://maps.google.com/?q=${displayLocation.lat},${displayLocation.lon}`
                  );
                } else if (displayLocation?.address) {
                  // Fallback to address search
                  Linking.openURL(
                    `https://maps.google.com/?q=${encodeURIComponent(address)}`
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.addressContainer}>
                <Text style={styles.locationAddress}>
                  {stripNameFromAddress(
                    displayLocation?.name ?? "",
                    displayLocation?.address ?? ""
                  )}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {/* Tags Section */}
          <Animated.View
            style={{
              maxHeight: contactInfoHeight,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={{
                opacity: contactInfoOpacity,
              }}
              pointerEvents={isScrolled ? "none" : "auto"}
            >
              {(placeDetails?.priceLevel !== undefined ||
                (placeDetails?.types && placeDetails.types.length > 0)) && (
                <View style={styles.tagsContainer}>
                  {placeDetails.priceLevel !== undefined && (
                    <Tag text={getPriceLevelText(placeDetails.priceLevel)} />
                  )}
                  {getRelevantPlaceTypes(placeDetails.types).map(
                    (type, index) => (
                      <Tag key={`type-${index}`} text={type} />
                    )
                  )}
                </View>
              )}
              {placeDetails && (
                <View style={styles.contactInfo}>
                  {placeDetails.phoneNumber && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() =>
                        Linking.openURL(`tel:${placeDetails.phoneNumber}`)
                      }
                    >
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color={colors.onAccent}
                      />
                      <Text style={styles.contactText}>
                        {placeDetails.phoneNumber}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {placeDetails.website && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => Linking.openURL(placeDetails.website!)}
                    >
                      <Ionicons
                        name="globe-outline"
                        size={18}
                        color={colors.onAccent}
                      />
                      <Text style={styles.contactText} numberOfLines={1}>
                        Website
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Animated.View>
          </Animated.View>
          {loadingPlaceDetails && (
            <Text style={styles.loadingText}>Loading contact info...</Text>
          )}
        </View>
      </View>
      <View style={styles.reviewsContainer}>
        <FlatList
          data={locationReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
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
    fontSize: 18,
    fontWeight: "600" as const,
    color: t.colors.text,
    marginBottom: t.spacing.xs,
  },
  priceLevel: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: t.colors.textSecondary,
    marginLeft: t.spacing.sm,
  },
  locationAddress: {
    fontSize: 16,
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
    fontSize: 14,
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
    marginVertical: t.spacing.sm,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "600" as const,
  },
  headerButtonLeft: {
    marginLeft: 5,
  },
  headerButtonRight: {
    marginRight: 15,
  },
  headerTitleContainer: {
    alignItems: "center" as const,
    flex: 1,
    maxWidth: "80%" as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: t.colors.text,
    flexShrink: 1,
  },
}));

export default Location;

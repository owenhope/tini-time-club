import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
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
import { getBlockedUserIds } from "@/utils/blockUtils";
import { useProfile } from "@/context/profile-context";
import imageCache from "@/utils/imageCache";
import RatingCircles from "@/components/RatingCircles";
import AnalyticService from "@/services/analyticsService";
import {
  getPlaceDetailsByNameAndAddress,
  getRelevantPlaceTypes,
} from "@/utils/locationUtils";
import { Linking } from "react-native";
import Tag from "@/components/Tag";

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
const COLORS = {
  primary: "#B6A3E2",
  taste: "#9E9E9E",
  presentation: "#9E9E9E",
  white: "#fff",
  gray: "#ccc",
  text: "#555",
} as const;

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
            <Ionicons name="arrow-back" size={24} color="black" />
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
                <Ionicons name="location" size={24} color="black" />
              </TouchableOpacity>
            );
          }
          return null;
        },
      });
    }
  }, [displayLocation, navigation, router]);

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
        .select(`
          id,
          name,
          address,
          location,
          reviews!reviews_location_fkey(
            taste,
            presentation,
            state
          )
        `)
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
      let rating = null;
      let taste_avg = null;
      let presentation_avg = null;

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
      let lat = null;
      let lon = null;
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
          <ActivityIndicator size="large" color={COLORS.primary} />
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

  const onRefresh = useCallback(() => {
    if (displayLocation?.id) {
      loadedLocationIdRef.current = null; // Reset to allow reload

      // Load location reviews inline
      const loadReviews = async () => {
        setLoadingReviews(true);
        try {
          // Get blocked user IDs to filter out their reviews
          const blockedIds = profile ? await getBlockedUserIds(profile.id) : [];

          const { data: reviewsData, error } = await supabase
            .from("reviews")
            .select(
              `
            id,
            comment,
            image_url,
            inserted_at,
            taste,
            presentation,
            location:locations!reviews_location_fkey(name),
            spirit:spirit(name),
            type:type(name),
            user_id,
            profile:profiles!reviews_user_id_fkey1(id, username, avatar_url)
            `
            )
            .eq("location", displayLocation.id)
            .eq("state", 1)
            .not("profile.deleted", "eq", true)
            .order("inserted_at", { ascending: false });

          if (error) {
            console.error("Error fetching location reviews:", error);
            setLoadingReviews(false);
            return;
          }

          // Filter out reviews from blocked users
          const filteredReviews = reviewsData.filter(
            (review: any) => !blockedIds.includes(review.user_id)
          );

          // Get image URLs using cache
          const imagePaths = filteredReviews.map(
            (review: any) => review.image_url
          );
          const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

          const reviewsWithFullUrl = filteredReviews.map((review: any) => ({
            ...review,
            image_url: imageUrls[review.image_url] || review.image_url,
          }));
          setLocationReviews(reviewsWithFullUrl);
          setLoadingReviews(false);
        } catch (err) {
          console.error(
            "Unexpected error while fetching location reviews:",
            err
          );
          setLoadingReviews(false);
        }
      };

      loadReviews();
    }
  }, [displayLocation?.id, profile?.id]);

  useEffect(() => {
    if (
      displayLocation?.id &&
      loadedLocationIdRef.current !== displayLocation.id
    ) {
      loadedLocationIdRef.current = displayLocation.id;

      // Load location image
      loadLocationImage(displayLocation.id);

      // Load location reviews inline to avoid dependency issues
      const loadReviews = async () => {
        setLoadingReviews(true);
        try {
          // Get blocked user IDs to filter out their reviews
          const blockedIds = profile ? await getBlockedUserIds(profile.id) : [];

          const { data: reviewsData, error } = await supabase
            .from("reviews")
            .select(
              `
            id,
            comment,
            image_url,
            inserted_at,
            taste,
            presentation,
            location:locations!reviews_location_fkey(name),
            spirit:spirit(name),
            type:type(name),
            user_id,
            profile:profiles!reviews_user_id_fkey1(id, username, avatar_url)
            `
            )
            .eq("location", displayLocation.id)
            .eq("state", 1)
            .not("profile.deleted", "eq", true)
            .order("inserted_at", { ascending: false });

          if (error) {
            console.error("Error fetching location reviews:", error);
            setLoadingReviews(false);
            return;
          }

          // Filter out reviews from blocked users
          const filteredReviews = reviewsData.filter(
            (review: any) => !blockedIds.includes(review.user_id)
          );

          // Get image URLs using cache
          const imagePaths = filteredReviews.map(
            (review: any) => review.image_url
          );
          const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

          const reviewsWithFullUrl = filteredReviews.map((review: any) => ({
            ...review,
            image_url: imageUrls[review.image_url] || review.image_url,
          }));
          setLocationReviews(reviewsWithFullUrl);
          setLoadingReviews(false);
        } catch (err) {
          console.error(
            "Unexpected error while fetching location reviews:",
            err
          );
          setLoadingReviews(false);
        }
      };

      loadReviews();
    }
  }, [displayLocation?.id, profile?.id]);

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
                      <Ionicons name="call-outline" size={18} color="#fff" />
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
                      <Ionicons name="globe-outline" size={18} color="#fff" />
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
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    padding: 16,
  },
  addressRow: {
    paddingTop: 8,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  locationName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  priceLevel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginLeft: 8,
  },
  locationAddress: {
    fontSize: 16,
    color: "#333",
    lineHeight: 20,
    textAlign: "left",
  },
  contactInfo: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#B6A3E2",
  },
  contactText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  reviewsContainer: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text,
  },
  addReviewButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  addReviewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  headerButtonLeft: {
    marginLeft: 5,
  },
  headerButtonRight: {
    marginRight: 15,
  },
  headerTitleContainer: {
    alignItems: "center",
    flex: 1,
    maxWidth: "80%",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flexShrink: 1,
  },
});

export default Location;

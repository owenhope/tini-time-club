import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Controller } from "react-hook-form";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import "react-native-get-random-values";
import {
  calculateDistance,
  formatDistance,
  getNameMatchScore,
  filterRelevantPlaces,
  deduplicatePlaces,
} from "@/utils/locationUtils";
import {
  autocompleteVenues,
  fetchVenue,
  newSessionToken,
  searchNearbyVenues,
  type PlaceResult,
} from "@/services/placesService";
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError, warn } from "@/utils/log";

export interface LocationInputValue {
  name: string;
  address?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  place_id: string;
}

interface LocationInputProps {
  control: any;
  disabled?: boolean;
  onLocationSelected?: (location: LocationInputValue) => void;
}

let cachedUserLocation: Location.LocationObject | null = null;
let cachedNearbyPlaces: PlaceResult[] = [];
let hasLoadedNearbyPlaces = false;
let nearbyPlacesRequest: Promise<PlaceResult[]> | null = null;

const loadNearbyPlaces = (userLocation: Location.LocationObject) => {
  if (hasLoadedNearbyPlaces) return Promise.resolve(cachedNearbyPlaces);
  if (nearbyPlacesRequest) return nearbyPlacesRequest;

  const { latitude, longitude } = userLocation.coords;
  nearbyPlacesRequest = searchNearbyVenues({ latitude, longitude })
    .then((places) => {
      cachedNearbyPlaces = deduplicatePlaces(filterRelevantPlaces(places));
      hasLoadedNearbyPlaces = true;
      return cachedNearbyPlaces;
    })
    .finally(() => {
      nearbyPlacesRequest = null;
    });

  return nearbyPlacesRequest;
};

const LocationInput = ({
  control,
  disabled = false,
  onLocationSelected,
}: LocationInputProps) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchQueryRef = useRef("");
  const searchRequestRef = useRef(0);
  const selectionRequestRef = useRef(0);
  const hasAppliedLocationRef = useRef(false);
  // One autocomplete billing session per typing interaction.
  const sessionTokenRef = useRef<string | null>(null);
  const [isResolvingId, setIsResolvingId] = useState<string | null>(null);

  // Get user location on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (cachedUserLocation) {
          setLocation(cachedUserLocation);
          setNearbyPlaces(cachedNearbyPlaces);
          const places = await loadNearbyPlaces(cachedUserLocation);
          if (mounted) setNearbyPlaces(places);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || !mounted) return;

        const lastKnownLocation = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
        });
        if (lastKnownLocation && mounted) {
          cachedUserLocation = lastKnownLocation;
          setLocation(lastKnownLocation);
          const places = await loadNearbyPlaces(lastKnownLocation);
          if (mounted) setNearbyPlaces(places);
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) {
          cachedUserLocation = currentLocation;
          setLocation(currentLocation);
          if (!lastKnownLocation) {
            const places = await loadNearbyPlaces(currentLocation);
            if (mounted) setNearbyPlaces(places);
          }
        }
      } catch (error) {
        warn(
          "Current location unavailable; location search still works.",
          error
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Search-as-you-type via Autocomplete (New). One session token spans the
  // whole typing interaction and is closed by the details fetch on selection,
  // which is what gets the per-session billing rate.
  const performSearch = useCallback(
    async (query: string, requestId: number) => {
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = newSessionToken();
        }
        const predictions = await autocompleteVenues(
          query,
          sessionTokenRef.current,
          location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }
            : null
        );

        // Predictions carry types, so the geography filter applies as-is.
        const filtered = filterRelevantPlaces(predictions);

        filtered.sort((a, b) => {
          const scoreA = getNameMatchScore(a.name || "", query);
          const scoreB = getNameMatchScore(b.name || "", query);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return (
            (a.distance_meters ?? Number.MAX_SAFE_INTEGER) -
            (b.distance_meters ?? Number.MAX_SAFE_INTEGER)
          );
        });

        if (
          requestId === searchRequestRef.current &&
          query === searchQueryRef.current
        ) {
          setSearchResults(filtered);
        }
      } catch (error) {
        reportError("Error searching places:", error);
        if (requestId === searchRequestRef.current) setSearchResults([]);
      } finally {
        if (requestId === searchRequestRef.current) setIsSearching(false);
      }
    },
    [location]
  );

  useEffect(() => {
    if (!location || hasAppliedLocationRef.current) return;
    hasAppliedLocationRef.current = true;

    const activeQuery = searchQueryRef.current;
    if (activeQuery.length < 2) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    performSearch(activeQuery, ++searchRequestRef.current);
  }, [location, performSearch]);

  // Debounced search handler
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      searchQueryRef.current = query;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      const requestId = ++searchRequestRef.current;
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      searchTimeoutRef.current = setTimeout(
        () => performSearch(query, requestId),
        300
      );
    },
    [performSearch]
  );

  // Cleanup
  useEffect(
    () => () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    },
    []
  );

  const handleClearSearch = () => {
    searchRequestRef.current += 1;
    setSearchQuery("");
    searchQueryRef.current = "";
    setSearchResults([]);
    setIsSearching(false);
    sessionTokenRef.current = null;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  };

  // Autocomplete predictions have no coordinates; resolve on selection. The
  // details call also terminates the autocomplete billing session.
  const selectPlace = async (
    place: PlaceResult,
    onSelect: (data: LocationInputValue | null) => void
  ) => {
    const requestId = ++selectionRequestRef.current;
    let resolved = place;
    if (!place.geometry?.location) {
      setIsResolvingId(place.place_id);
      const sessionToken = sessionTokenRef.current ?? undefined;
      sessionTokenRef.current = null;
      const details = await fetchVenue(place.place_id, sessionToken);
      if (requestId !== selectionRequestRef.current) return;
      setIsResolvingId(null);
      if (!details?.geometry?.location) return;
      resolved = { ...place, ...details };
    }

    const nextLocation: LocationInputValue = {
      name: resolved.name,
      address: resolved.vicinity || resolved.formatted_address,
      coordinates: {
        latitude: resolved.geometry!.location.lat,
        longitude: resolved.geometry!.location.lng,
      },
      place_id: resolved.place_id,
    };
    onSelect(nextLocation);
    onLocationSelected?.(nextLocation);
  };

  // Render place list
  const renderPlaceList = (
    places: any[],
    selectedValue: any,
    onSelect: (data: any) => void
  ) => (
    <ScrollView
      style={styles.placesContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {places
        .filter((place) => place.place_id !== selectedValue?.place_id)
        .map((place) => {
          const placeName = place.name || "";
          const selected = selectedValue?.place_id === place.place_id;
          const placeLocation = place.geometry?.location;
          // Autocomplete predictions ship an origin distance; nearby results
          // have coordinates to compute one from.
          const distance =
            place.distance_meters != null
              ? place.distance_meters / 1000
              : location?.coords && placeLocation
                ? calculateDistance(
                    location.coords.latitude,
                    location.coords.longitude,
                    placeLocation.lat,
                    placeLocation.lng
                  )
                : null;

          return (
            <TouchableOpacity
              key={place.place_id}
              style={[
                styles.placeButton,
                selected && styles.selectedPlaceButton,
              ]}
              onPress={() => {
                void Haptics.selectionAsync();
                if (selected) {
                  onSelect(null);
                } else {
                  void selectPlace(place, onSelect);
                }
              }}
              disabled={disabled || isResolvingId === place.place_id}
            >
              <View style={styles.placeContent}>
                <View style={styles.placeTextContainer}>
                  <Text
                    style={[
                      styles.placeName,
                      selected && styles.selectedPlaceText,
                    ]}
                  >
                    {placeName}
                  </Text>
                  <Text
                    style={[
                      styles.placeAddress,
                      selected && styles.selectedPlaceText,
                    ]}
                  >
                    {place.vicinity || place.formatted_address}
                  </Text>
                </View>
                <View style={styles.rightContainer}>
                  {isResolvingId === place.place_id && (
                    <ActivityIndicator size="small" color={colors.accent} />
                  )}
                  {distance !== null && (
                    <Text
                      style={[
                        styles.distanceText,
                        selected && styles.selectedPlaceText,
                      ]}
                    >
                      {formatDistance(distance)}
                    </Text>
                  )}
                  {place.tini_time_rating && (
                    <View style={styles.ratingContainer}>
                      <View style={styles.ratingCircle}>
                        <Text style={styles.ratingText}>
                          {place.tini_time_rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
    </ScrollView>
  );

  return (
    <Controller
      control={control}
      name="location"
      rules={{ required: true }}
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search bars, lounges, or cocktail spots..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              editable={!disabled}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearSearch}
                disabled={disabled}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {value ? (
            <View style={styles.currentLocation}>
              <View style={styles.placeTextContainer}>
                <Text style={styles.currentLocationName}>{value.name}</Text>
                {value.address ? (
                  <Text style={styles.currentLocationAddress}>
                    {value.address}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => onChange(null)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Clear selected location"
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={22}
                  color={colors.onAccent}
                />
              </TouchableOpacity>
            </View>
          ) : null}

          {searchQuery.length > 0 && searchResults.length > 0 ? (
            renderPlaceList(searchResults, value, onChange)
          ) : searchQuery.length > 0 && isSearching ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : (
            renderPlaceList(nearbyPlaces.slice(0, 10), value, onChange)
          )}
        </View>
      )}
    />
  );
};

const useStyles = makeStyles((t) => ({
  inputContainer: {
    marginVertical: 5,
    width: "100%" as const,
  },
  searchInputContainer: {
    position: "relative" as const,
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: t.colors.surfaceSunken,
    height: 50,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: 0,
    paddingRight: 50,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: "center" as const,
    includeFontPadding: false,
    color: t.colors.text,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  currentLocation: {
    minHeight: 64,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  currentLocationName: {
    ...t.typography.bodyStrong,
    color: t.colors.onAccent,
    marginBottom: t.spacing.xs,
  },
  currentLocationAddress: {
    ...t.typography.caption,
    color: t.colors.onAccent,
  },
  clearButton: {
    position: "absolute" as const,
    right: 15,
    top: 15,
    padding: 2,
  },
  placesContainer: {
    maxHeight: 450,
  },
  placeButton: {
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  selectedPlaceButton: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  placeContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  placeTextContainer: {
    flex: 1,
    marginRight: t.spacing.md,
  },
  placeName: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: t.colors.text,
    marginBottom: t.spacing.xs,
  },
  placeAddress: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.colors.textSecondary,
  },
  rightContainer: {
    alignItems: "flex-end" as const,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.xs,
  },
  ratingContainer: {
    alignItems: "center" as const,
  },
  ratingCircle: {
    width: 32,
    height: 32,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: t.spacing.sm,
    ...t.elevation.card,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: t.colors.onAccent,
  },
  selectedPlaceText: {
    color: t.colors.onAccent,
  },
  loadingContainer: {
    padding: t.spacing.xl - 4,
    alignItems: "center" as const,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: t.colors.textSecondary,
  },
}));

export default LocationInput;

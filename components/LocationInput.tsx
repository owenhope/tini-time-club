import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Controller } from "react-hook-form";
import * as Location from "expo-location";
import "react-native-get-random-values";
import {
  GOOGLE_MAPS_API_KEY,
  RELEVANT_PLACE_TYPES,
  calculateDistance,
  formatDistance,
  getNameMatchScore,
  filterRelevantPlaces,
  deduplicatePlaces,
} from "@/utils/locationUtils";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";

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
  const hasAppliedLocationRef = useRef(false);

  // Get user location on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || !mounted) return;

        const lastKnownLocation = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
        });
        if (lastKnownLocation && mounted) {
          setLocation(lastKnownLocation);
          fetchNearbyPlaces(lastKnownLocation);
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) {
          setLocation(currentLocation);
          fetchNearbyPlaces(currentLocation);
        }
      } catch (error) {
        reportError("Error getting location:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch nearby places
  const fetchNearbyPlaces = async (userLocation: Location.LocationObject) => {
    try {
      const { latitude, longitude } = userLocation.coords;
      const results = await Promise.all(
        RELEVANT_PLACE_TYPES.map(async (type) => {
          try {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=10000&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.results || [];
          } catch {
            return [];
          }
        })
      );

      const allPlaces = results.flat();
      const uniquePlaces = deduplicatePlaces(allPlaces);

      uniquePlaces.sort((a, b) => {
        const distA = calculateDistance(
          latitude,
          longitude,
          a.geometry?.location?.lat || 0,
          a.geometry?.location?.lng || 0
        );
        const distB = calculateDistance(
          latitude,
          longitude,
          b.geometry?.location?.lat || 0,
          b.geometry?.location?.lng || 0
        );
        return distA - distB;
      });

      setNearbyPlaces(uniquePlaces);
    } catch (error) {
      reportError("Error fetching nearby places:", error);
    }
  };

  // Search for places
  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const seenIds = new Set<string>();
        const results: any[] = [];

        // Text search (finds places anywhere)
        try {
          const locationBias = location
            ? `&location=${location.coords.latitude},${location.coords.longitude}&radius=10000`
            : "";
          const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            query
          )}${locationBias}&key=${GOOGLE_MAPS_API_KEY}`;
          const response = await fetch(url);
          const data = await response.json();
          (data.results || []).forEach((place: any) => {
            if (place.place_id && !seenIds.has(place.place_id)) {
              seenIds.add(place.place_id);
              results.push(place);
            }
          });
        } catch (error) {
          reportError("Error in text search:", error);
        }

        // Nearby search for short queries (if location available)
        if (location && query.length <= 3) {
          const nearbyResults = await Promise.all(
            RELEVANT_PLACE_TYPES.slice(0, 7).map(async (type) => {
              try {
                const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${
                  location.coords.latitude
                },${
                  location.coords.longitude
                }&radius=10000&type=${type}&keyword=${encodeURIComponent(
                  query
                )}&key=${GOOGLE_MAPS_API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();
                return data.results || [];
              } catch {
                return [];
              }
            })
          );
          nearbyResults.flat().forEach((place: any) => {
            if (place.place_id && !seenIds.has(place.place_id)) {
              seenIds.add(place.place_id);
              results.push(place);
            }
          });
        }

        // Filter and sort
        const filtered = filterRelevantPlaces(results);

        filtered.sort((a, b) => {
          const scoreA = getNameMatchScore(a.name || "", query);
          const scoreB = getNameMatchScore(b.name || "", query);
          if (scoreA !== scoreB) return scoreB - scoreA;
          if (
            location?.coords &&
            a.geometry?.location &&
            b.geometry?.location
          ) {
            const distA = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              a.geometry.location.lat,
              a.geometry.location.lng
            );
            const distB = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              b.geometry.location.lat,
              b.geometry.location.lng
            );
            return distA - distB;
          }
          return 0;
        });

        setSearchResults(filtered);
      } catch (error) {
        reportError("Error searching places:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
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
    performSearch(activeQuery);
  }, [location, performSearch]);

  // Debounced search handler
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      searchQueryRef.current = query;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      searchTimeoutRef.current = setTimeout(() => performSearch(query), 300);
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
    setSearchQuery("");
    searchQueryRef.current = "";
    setSearchResults([]);
    setIsSearching(false);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
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
      {places.map((place) => {
        const placeName = place.name || "";
        const selected = selectedValue?.name === placeName;
        const placeLocation = place.geometry?.location;
        const distance =
          location?.coords && placeLocation
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
            style={[styles.placeButton, selected && styles.selectedPlaceButton]}
            onPress={() => {
              if (selected) {
                onSelect(null);
              } else if (placeLocation) {
                const nextLocation: LocationInputValue = {
                  name: placeName,
                  address: place.vicinity || place.formatted_address,
                  coordinates: {
                    latitude: placeLocation.lat,
                    longitude: placeLocation.lng,
                  },
                  place_id: place.place_id, // Store place_id for fetching details later
                };
                onSelect(nextLocation);
                onLocationSelected?.(nextLocation);
              }
            }}
            disabled={disabled}
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
    borderRadius: 25,
    paddingHorizontal: t.spacing.xl - 4,
    paddingRight: 50,
    fontSize: 15,
    color: t.colors.text,
    borderWidth: 1,
    borderColor: t.colors.border,
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
    fontWeight: "600" as const,
    color: t.colors.text,
    marginBottom: t.spacing.xs,
  },
  placeAddress: {
    fontSize: 13,
    color: t.colors.textSecondary,
  },
  rightContainer: {
    alignItems: "flex-end" as const,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.xs,
  },
  ratingContainer: {
    alignItems: "center" as const,
  },
  ratingCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: t.spacing.sm,
    ...t.elevation.card,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700" as const,
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
    fontSize: 15,
    color: t.colors.textSecondary,
  },
}));

export default LocationInput;

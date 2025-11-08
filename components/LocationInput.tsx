import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
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

const LocationInput = ({ control }: { control: any }) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user location on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || !mounted) return;
        const currentLocation = await Location.getCurrentPositionAsync({});
        if (mounted) {
          setLocation(currentLocation);
          fetchNearbyPlaces(currentLocation);
        }
      } catch (error) {
        console.error("Error getting location:", error);
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
      console.error("Error fetching nearby places:", error);
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
          const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            query
          )}&key=${GOOGLE_MAPS_API_KEY}`;
          const response = await fetch(url);
          const data = await response.json();
          (data.results || []).forEach((place: any) => {
            if (place.place_id && !seenIds.has(place.place_id)) {
              seenIds.add(place.place_id);
              results.push(place);
            }
          });
        } catch (error) {
          console.error("Error in text search:", error);
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
        console.error("Error searching places:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [location]
  );

  // Debounced search handler
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
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
                onSelect({
                  name: placeName,
                  address: place.vicinity || place.formatted_address,
                  coordinates: {
                    latitude: placeLocation.lat,
                    longitude: placeLocation.lng,
                  },
                });
              }
            }}
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
              placeholderTextColor="#AAA"
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearSearch}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
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

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 5,
    width: "100%",
  },
  searchInputContainer: {
    position: "relative",
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: "#fafafa",
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingRight: 50,
    fontSize: 16,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  clearButton: {
    position: "absolute",
    right: 15,
    top: 15,
    padding: 2,
  },
  placesContainer: {
    maxHeight: 450,
  },
  placeButton: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  selectedPlaceButton: {
    backgroundColor: "#B6A3E2",
    borderColor: "#B6A3E2",
  },
  placeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  placeTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: "#666",
  },
  rightContainer: {
    alignItems: "flex-end",
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  ratingContainer: {
    alignItems: "center",
  },
  ratingCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#B6A3E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    shadowColor: "#B6A3E2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  selectedPlaceText: {
    color: "#fff",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
});

export default LocationInput;

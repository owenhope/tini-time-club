import React, { useEffect, useState } from "react";
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

const LocationInput = ({ control }: { control: any }) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      await fetchNearbyPlaces(location);
    }

    getCurrentLocation();
  }, []);

  const fetchNearbyPlaces = async (userLocation: Location.LocationObject) => {
    try {
      const { latitude, longitude } = userLocation.coords;
      // Search for all types of places that serve alcohol
      // Combine multiple searches to get comprehensive results
      const types = [
        "bar",
        "restaurant",
        "night_club",
        "cafe",
        "lounge",
        "hotel", // Hotels often have bars
        "brewery",
        "meal_takeaway", // Some takeaway places serve alcohol
      ];

      const allResults: any[] = [];
      const seenIds = new Set<string>();

      // Search each type and combine unique results
      for (const type of types) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=10000&type=${type}&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`
          );
          const data = await response.json();
          if (data.results) {
            data.results.forEach((place: any) => {
              if (!seenIds.has(place.place_id)) {
                seenIds.add(place.place_id);
                allResults.push(place);
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching ${type}:`, error);
        }
      }

      // Sort by distance if we have location
      if (userLocation) {
        allResults.sort((a, b) => {
          const distanceA = calculateDistance(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            a.geometry.location.lat,
            a.geometry.location.lng
          );
          const distanceB = calculateDistance(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            b.geometry.location.lat,
            b.geometry.location.lng
          );
          return distanceA - distanceB;
        });
      }

      setNearbyPlaces(allResults);
    } catch (error) {
      console.error("Error fetching nearby places:", error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      let searchUrl;
      let results: any[] = [];

      if (query.length <= 3) {
        // For short queries, try nearby search first if we have location
        if (location) {
          // Search multiple types that serve alcohol and combine results
          const types = [
            "bar",
            "restaurant",
            "night_club",
            "cafe",
            "lounge",
            "hotel",
            "brewery",
          ];
          const seenIds = new Set<string>();

          for (const type of types) {
            try {
              const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${
                location.coords.latitude
              },${
                location.coords.longitude
              }&radius=10000&type=${type}&keyword=${encodeURIComponent(
                query
              )}&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`;

              const nearbyResponse = await fetch(nearbyUrl);
              const nearbyData = await nearbyResponse.json();
              if (nearbyData.results) {
                nearbyData.results.forEach((place: any) => {
                  if (!seenIds.has(place.place_id)) {
                    seenIds.add(place.place_id);
                    results.push(place);
                  }
                });
              }
            } catch (error) {
              console.error(`Error searching ${type}:`, error);
            }
          }

          // If nearby search returns few results, also try text search as fallback
          if (results.length < 5) {
            const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
              query
            )}&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`;
            const textResponse = await fetch(textSearchUrl);
            const textData = await textResponse.json();
            const textResults = textData.results || [];

            // Merge results, avoiding duplicates
            textResults.forEach((place: any) => {
              if (!seenIds.has(place.place_id)) {
                seenIds.add(place.place_id);
                results.push(place);
              }
            });
          }
        } else {
          // No location, use text search without type restrictions
          searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            query
          )}&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`;
          const response = await fetch(searchUrl);
          const data = await response.json();
          results = data.results || [];
        }
      } else {
        // For longer queries, use text search - it will naturally find places that serve alcohol
        searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          query
        )}&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        results = data.results || [];
      }

      // Sort results by distance if we have location
      if (location && results.length > 0) {
        results.sort((a, b) => {
          // Check if places have geometry/location data
          if (!a.geometry?.location || !b.geometry?.location) {
            return 0; // Keep original order if location data is missing
          }
          const distanceA = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            a.geometry.location.lat,
            a.geometry.location.lng
          );
          const distanceB = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            b.geometry.location.lat,
            b.geometry.location.lng
          );
          return distanceA - distanceB;
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching places:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  };

  const query = {
    key: "AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8",
    language: "en",
    types: "restaurant|cafe|bar",
    location: location
      ? `${location.coords.latitude},${location.coords.longitude}`
      : undefined,
    radius: location ? 5000 : undefined,
  };

  const renderPlaceList = (
    places: any[],
    title: string,
    selectedValue: any,
    onSelect: (data: any) => void
  ) => (
    <>
      <ScrollView
        style={styles.placesContainer}
        showsVerticalScrollIndicator={false}
      >
        {places.map((place) => {
          const distance = location
            ? calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                place.geometry.location.lat,
                place.geometry.location.lng
              )
            : null;

          return (
            <TouchableOpacity
              key={place.place_id}
              style={[
                styles.placeButton,
                selectedValue?.name === place.name &&
                  styles.selectedPlaceButton,
              ]}
              onPress={() => {
                // If this place is already selected, unselect it
                if (selectedValue?.name === place.name) {
                  onSelect(null);
                } else {
                  // Otherwise, select this place
                  const locationData = {
                    name: place.name,
                    address: place.vicinity || place.formatted_address,
                    coordinates: {
                      latitude: place.geometry.location.lat,
                      longitude: place.geometry.location.lng,
                    },
                  };
                  onSelect(locationData);
                }
              }}
            >
              <View style={styles.placeContent}>
                <View style={styles.placeTextContainer}>
                  <Text
                    style={[
                      styles.placeName,
                      selectedValue?.name === place.name &&
                        styles.selectedPlaceText,
                    ]}
                  >
                    {place.name}
                  </Text>
                  <Text
                    style={[
                      styles.placeAddress,
                      selectedValue?.name === place.name &&
                        styles.selectedPlaceText,
                    ]}
                  >
                    {place.vicinity || place.formatted_address}
                  </Text>
                </View>
                <View style={styles.rightContainer}>
                  {distance && (
                    <Text
                      style={[
                        styles.distanceText,
                        selectedValue?.name === place.name &&
                          styles.selectedPlaceText,
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
    </>
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
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsSearching(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.length > 0 && searchResults.length > 0 ? (
            renderPlaceList(searchResults, "Search Results", value, onChange)
          ) : searchQuery.length > 0 && isSearching ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : (
            renderPlaceList(
              nearbyPlaces.slice(0, 10),
              "Nearby Locations",
              value,
              onChange
            )
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 10,
    textTransform: "capitalize",
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

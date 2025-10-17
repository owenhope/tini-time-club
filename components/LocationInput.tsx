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
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=2000&type=bar|night_club|restaurant&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`
      );
      const data = await response.json();
      setNearbyPlaces(data.results || []);
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

      if (query.length <= 3) {
        // For short queries, prioritize nearby places with the search term
        if (location) {
          searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${
            location.coords.latitude
          },${
            location.coords.longitude
          }&radius=2000&type=bar|night_club|restaurant&keyword=${encodeURIComponent(
            query
          )}&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`;
        } else {
          searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            query
          )}&type=bar|night_club|restaurant&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`;
        }
      } else {
        // For longer queries, use text search for more specific results
        searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          query
        )}&type=bar|night_club|restaurant&key=AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8`;
      }

      const response = await fetch(searchUrl);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Error searching places:", error);
      setSearchResults([]);
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

          {isSearching && searchResults.length > 0
            ? renderPlaceList(searchResults, "Search Results", value, onChange)
            : renderPlaceList(
                nearbyPlaces.slice(0, 10),
                "Nearby Locations",
                value,
                onChange
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
});

export default LocationInput;

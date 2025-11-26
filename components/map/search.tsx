import React, { forwardRef, useState, useCallback, useRef, useEffect } from "react";
import { TouchableOpacity, View, Text, TextInput, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GOOGLE_MAPS_API_KEY,
  RELEVANT_PLACE_TYPES,
  filterRelevantPlaces,
  getNameMatchScore,
  calculateDistance,
} from "@/utils/locationUtils";

interface SearchProps {
  onPlaceSelected: (newRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
  currentLocation: { latitude: number; longitude: number } | null;
}

interface SearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  types?: string[];
}

const Search = forwardRef<any, SearchProps>(
  ({ onPlaceSelected, currentLocation }, ref) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Expose clear method via ref
    React.useImperativeHandle(ref, () => ({
      setAddressText: (text: string) => {
        setSearchQuery(text);
        if (!text) {
          setSearchResults([]);
        }
      },
    }));

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
          const results: SearchResult[] = [];

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
          if (currentLocation && query.length <= 3) {
            const nearbyResults = await Promise.all(
              RELEVANT_PLACE_TYPES.slice(0, 7).map(async (type) => {
                try {
                  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${
                    currentLocation.latitude
                  },${
                    currentLocation.longitude
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

          // Filter and sort (same logic as LocationInput)
          const filtered = filterRelevantPlaces(results);

          filtered.sort((a, b) => {
            const scoreA = getNameMatchScore(a.name || "", query);
            const scoreB = getNameMatchScore(b.name || "", query);
            if (scoreA !== scoreB) return scoreB - scoreA;
            if (
              currentLocation &&
              a.geometry?.location &&
              b.geometry?.location
            ) {
              const distA = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                a.geometry.location.lat,
                a.geometry.location.lng
              );
              const distB = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                b.geometry.location.lat,
                b.geometry.location.lng
              );
              return distA - distB;
            }
            return 0;
          });

          setSearchResults(filtered.slice(0, 5)); // Limit to 5 results for autocomplete
        } catch (error) {
          console.error("Error searching places:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      },
      [currentLocation]
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

    const handleSelectPlace = (place: SearchResult) => {
      if (!place.geometry?.location) return;

      const { location, viewport } = place.geometry;

      let newRegion = {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      if (viewport) {
        const { northeast, southwest } = viewport;
        newRegion = {
          latitude: (northeast.lat + southwest.lat) / 2,
          longitude: (northeast.lng + southwest.lng) / 2,
          latitudeDelta: Math.abs(northeast.lat - southwest.lat),
          longitudeDelta: Math.abs(northeast.lng - southwest.lng),
        };
      }

      onPlaceSelected(newRegion);
      setSearchQuery("");
      setSearchResults([]);
    };

    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Search"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle-outline" color="black" size={22} />
            </TouchableOpacity>
          )}
        </View>
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectPlace(item)}
                >
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {item.vicinity || item.formatted_address}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.resultsList}
            />
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 0,
    padding: 8,
    zIndex: 1,
  },
  searchContainer: {
    position: "relative",
    padding: 4,
  },
  textInput: {
    backgroundColor: "#fff",
    paddingLeft: 20,
    paddingRight: 40,
    height: 44,
    borderRadius: 8,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButton: {
    position: "absolute",
    right: 15,
    top: 15,
    zIndex: 100,
  },
  resultsContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: "#666",
  },
});

export default Search;

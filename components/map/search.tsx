import React, {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  TouchableOpacity,
  View,
  Text,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { filterRelevantPlaces, getNameMatchScore } from "@/utils/locationUtils";
import {
  autocompleteVenues,
  fetchVenue,
  newSessionToken,
  type PlaceResult,
} from "@/services/placesService";
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";

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
    const styles = useStyles();
    const { colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionTokenRef = useRef<string | null>(null);

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
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = newSessionToken();
          }
          const predictions = await autocompleteVenues(
            query,
            sessionTokenRef.current,
            currentLocation
          );

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

          setSearchResults(filtered.slice(0, 5)); // Limit to 5 results for autocomplete
        } catch (error) {
          reportError("Error searching places:", error);
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

    const handleSelectPlace = async (place: PlaceResult) => {
      // Predictions carry no coordinates; the details fetch resolves them
      // and terminates the autocomplete billing session.
      const resolved = place.geometry?.location
        ? place
        : await fetchVenue(
            place.place_id,
            sessionTokenRef.current ?? undefined
          );
      sessionTokenRef.current = null;
      if (!resolved?.geometry?.location) return;

      const { location, viewport } = resolved.geometry;

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
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <Ionicons
                name="close-circle-outline"
                color={colors.textSecondary}
                size={22}
              />
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

const useStyles = makeStyles((t) => ({
  container: {
    flex: 0,
    padding: t.spacing.sm,
    zIndex: 1,
  },
  searchContainer: {
    position: "relative" as const,
    padding: t.spacing.xs,
  },
  textInput: {
    backgroundColor: t.colors.surface,
    color: t.colors.text,
    paddingLeft: t.spacing.xl - 4,
    paddingRight: 40,
    height: 44,
    borderRadius: t.radius.pill,
    fontFamily: fonts.regular,
    fontSize: 15,
    ...t.elevation.card,
  },
  clearButton: {
    position: "absolute" as const,
    right: 15,
    top: 15,
    zIndex: 100,
  },
  resultsContainer: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    marginTop: t.spacing.xs,
    maxHeight: 200,
    ...t.elevation.card,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    padding: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  resultName: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: t.colors.text,
    marginBottom: t.spacing.xs,
  },
  resultAddress: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.colors.textSecondary,
  },
}));

Search.displayName = "Search";

export default Search;

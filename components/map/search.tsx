import React, { forwardRef } from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";

interface SearchProps {
  onPlaceSelected: (newRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
  currentLocation: { latitude: number; longitude: number } | null;
}

const Search = forwardRef<GooglePlacesAutocompleteRef, SearchProps>(
  ({ onPlaceSelected, currentLocation }, ref) => {
    return (
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder="Search"
        fetchDetails
        query={{
          key: "AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8",
          language: "en",
          location: currentLocation
            ? `${currentLocation.latitude},${currentLocation.longitude}`
            : "37.33,-122",
          radius: 10000,
          types: "establishment",
          keyword: "restaurant|night_club|bar|hotel",
        }}
        onPress={(data, detail = null) => {
          if (!detail?.geometry) return;
          const { location, viewport } = detail.geometry;

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
        }}
        styles={{
          container: { flex: 0, padding: 8 },
          textInput: { paddingLeft: 20, paddingRight: 40 },
          textInputContainer: { padding: 4 },
          poweredContainer: { display: "none" },
        }}
        textInputProps={{ clearButtonMode: "never" }}
        renderRightButton={() => (
          <TouchableOpacity
            style={{ position: "absolute", right: 15, top: 15, zIndex: 100 }}
            onPress={() => {
              (
                ref as React.RefObject<GooglePlacesAutocompleteRef>
              )?.current?.setAddressText("");
            }}
          >
            <Ionicons name="close-circle-outline" color="black" size={22} />
          </TouchableOpacity>
        )}
      />
    );
  }
);

export default Search;

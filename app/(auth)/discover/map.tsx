import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useEffect, useState, useRef, createRef } from "react";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { PROVIDER_GOOGLE, Region, Marker } from "react-native-maps";
import * as Location from "expo-location";
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from "react-native-google-places-autocomplete";
import "react-native-get-random-values";
import { mapStyle } from "@/assets/mapStyle";
import MapView from "react-native-map-clustering";
import { supabase } from "@/utils/supabase";

const INITIAL_REGION: Region = {
  latitude: 37.33,
  longitude: -122,
  latitudeDelta: 2,
  longitudeDelta: 2,
};

const Map = () => {
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const mapRef = createRef<any>();
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [locations, setLocations] = useState<any[]>([]);
  const googlePlaceAutoCompleteRef = useRef<GooglePlacesAutocompleteRef>(null);

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
      const initial = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setInitialRegion(initial);
      setRegion(initial);
      mapRef.current?.animateToRegion(initial, 1000);
    };

    getLocation();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      const min_lat = region.latitude - region.latitudeDelta / 2;
      const max_lat = region.latitude + region.latitudeDelta / 2;
      const min_long = region.longitude - region.longitudeDelta / 2;
      const max_long = region.longitude + region.longitudeDelta / 2;

      const { data, error } = await supabase.rpc("locations_in_view", {
        min_lat,
        min_long,
        max_lat,
        max_long,
      });

      if (error) {
        console.error("Error fetching locations in view:", error);
      } else {
        console.log("Fetched locations:", data);
        setLocations(data);
      }
    };

    fetchLocations();
  }, [region]);

  const zoomIn = async () => {
    mapRef.current?.animateCamera({ zoom: 13 });
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };

  return (
    <View style={{ flex: 1 }}>
      <GooglePlacesAutocomplete
        ref={googlePlaceAutoCompleteRef}
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
        onFail={(error) => console.error(error)}
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

          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
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
              googlePlaceAutoCompleteRef.current?.setAddressText("");
            }}
          >
            <Ionicons name={"close-circle-outline"} color={"black"} size={22} />
          </TouchableOpacity>
        )}
      />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType="standard"
        style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
        showsUserLocation
        showsMyLocationButton
        rotateEnabled={false}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        customMapStyle={mapStyle}
      >
        {locations.map((loc, index) => {
          if (loc.lat == null || loc.long == null) return null;
          return (
            <Marker
              key={index}
              coordinate={{ latitude: loc.lat, longitude: loc.long }}
            >
              <View style={styles.markerContainer}>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleText}>{loc.name}</Text>
                  <View style={styles.ratingCircle}>
                    <Text style={styles.ratingCircleText}>
                      {loc.rating ? loc.rating.toFixed(1) : "N/A"}
                    </Text>
                  </View>
                </View>
                <View style={styles.markerPin}>
                  <FontAwesome5
                    name="glass-martini-alt"
                    size={20}
                    color="silver"
                  />
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  btnContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    gap: 10,
    zIndex: -1,
  },
  btn: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 10 },
  },
  markerContainer: {
    alignItems: "center",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#2E86AB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginRight: 6,
  },
  ratingCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2E86AB",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingCircleText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  markerPin: {
    // This view wraps the icon.
  },
});

export default Map;

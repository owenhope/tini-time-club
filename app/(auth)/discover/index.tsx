import React, { useEffect, useState, createRef, useRef } from "react";
import { View, StyleSheet } from "react-native";
import MapView from "react-native-map-clustering";
import { Region } from "react-native-maps";
import * as Location from "expo-location";
import { mapStyle } from "@/assets/mapStyle";
import { supabase } from "@/utils/supabase";
import Search from "@/components/map/search";
import MapMarker from "@/components/map/marker";

const INITIAL_REGION: Region = {
  latitude: 37.33,
  longitude: -122,
  latitudeDelta: 2,
  longitudeDelta: 2,
};

function Map() {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [locations, setLocations] = useState<any[]>([]);
  const mapRef = createRef<any>();
  const searchRef = useRef(null);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  useEffect(() => {
    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
      const initial = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
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
        setLocations(data);
      }
    };

    fetchLocations();
  }, [region]);

  const handlePlaceSelected = (newRegion: Region) => {
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };

  return (
    <View style={{ flex: 1 }}>
      <Search
        ref={searchRef}
        onPlaceSelected={handlePlaceSelected}
        currentLocation={currentLocation}
      />
      <MapView
        ref={mapRef}
        provider="google"
        mapType="standard"
        style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
        showsUserLocation
        showsMyLocationButton
        rotateEnabled={false}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        customMapStyle={mapStyle}
      >
        {locations.map((loc, index) => (
          <MapMarker
            key={index}
            loc={loc}
            index={index}
            isSelected={selectedMarker === index}
            onPress={() =>
              setSelectedMarker(selectedMarker === index ? null : index)
            }
          />
        ))}
      </MapView>
    </View>
  );
}

export default Map;

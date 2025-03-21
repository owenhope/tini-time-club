import React, { useEffect, useState, createRef, useRef } from "react";
import { View, StyleSheet, Animated, PanResponder } from "react-native";
import MapView from "react-native-map-clustering";
import { Region, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { mapStyle } from "@/assets/mapStyle";
import { supabase } from "@/utils/supabase";
import Search from "@/components/map/search";
import LocationPin from "@/components/map/locationPin";
import LocationDetails from "@/components/map/locationDetails";

const INITIAL_REGION: Region = {
  latitude: 37.33,
  longitude: -122,
  latitudeDelta: 2,
  longitudeDelta: 2,
};

const BOTTOM_SHEET_HEIGHT = 300;

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
  const bottomSheetAnim = useRef(
    new Animated.Value(BOTTOM_SHEET_HEIGHT)
  ).current;

  // Function to dismiss the bottom sheet (animate down and clear selection)
  const handleDismiss = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: BOTTOM_SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedMarker(null);
      bottomSheetAnim.setValue(BOTTOM_SHEET_HEIGHT);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          bottomSheetAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          handleDismiss();
        } else {
          // Animate back up if not dragged far enough.
          Animated.timing(bottomSheetAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

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

  const handleMarkerPress = (index: number) => {
    setSelectedMarker(index);
    Animated.timing(bottomSheetAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

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
        provider={PROVIDER_GOOGLE}
        mapType="standard"
        clusteringEnabled={true}
        style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
        showsUserLocation
        showsMyLocationButton
        rotateEnabled={false}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        customMapStyle={mapStyle}
        onPress={() => {
          if (selectedMarker !== null) {
            handleDismiss();
          }
        }}
      >
        {locations.map((loc, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: loc.lat, longitude: loc.long }}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => handleMarkerPress(index)}
          >
            <LocationPin loc={loc} />
          </Marker>
        ))}
      </MapView>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: bottomSheetAnim }] },
        ]}
      >
        <View style={styles.dragIndicatorContainer}>
          <View style={styles.dragIndicator} />
        </View>
        {selectedMarker !== null && locations[selectedMarker] && (
          <LocationDetails loc={locations[selectedMarker]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pin: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2E86AB",
    justifyContent: "center",
    alignItems: "center",
  },
  pinText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  pinPointer: {
    position: "absolute",
    bottom: -10,
    left: "50%",
    transform: [{ translateX: -5 }],
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 10,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#2E86AB",
  },
  restaurantName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  dragIndicatorContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
  },
});

export default Map;

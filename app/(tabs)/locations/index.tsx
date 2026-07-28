import React, { useEffect, useState, createRef, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Keyboard,
  Platform,
  Text,
  TouchableOpacity,
  Linking,
} from "react-native";
import MapView from "@/components/map/ClusteredMap";
import {
  Region,
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import * as Location from "expo-location";
import { mapStyle } from "@/assets/mapStyle";
import { supabase } from "@/utils/supabase";
import LocationPin from "@/components/map/locationPin";
import LocationDetails from "@/components/map/locationDetails";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { makeStyles } from "@/theme";

const INITIAL_REGION: Region = {
  latitude: 37.33,
  longitude: -122,
  latitudeDelta: 2,
  longitudeDelta: 2,
};

const BOTTOM_SHEET_HEIGHT = 300;

function Map() {
  const styles = useStyles();
  const params = useLocalSearchParams();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [canOpenLocationSettings, setCanOpenLocationSettings] =
    useState<boolean>(false);
  const mapRef = createRef<any>();
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
      try {
        const { status, canAskAgain } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          // Without this the map silently sits on its hardcoded default region
          // and the user has no idea why nothing is nearby.
          setLocationNotice(
            canAskAgain
              ? "Location is off, so we can't show bars near you."
              : "Location is off. Enable it in Settings to see bars near you."
          );
          setCanOpenLocationSettings(!canAskAgain);
          return;
        }

        setLocationNotice(null);
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
      } catch (error) {
        console.error("Error getting location:", error);
        setLocationNotice("We couldn't determine your location.");
      }
    };

    getLocation();
  }, []);

  // Handle navigation to specific location from Location component
  useEffect(() => {
    if (params.lat && params.lon) {
      const lat = parseFloat(params.lat as string);
      const lon = parseFloat(params.lon as string);

      if (!isNaN(lat) && !isNaN(lon)) {
        const targetRegion: Region = {
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(targetRegion);

        // Wait a bit for map to be ready, then animate
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion(targetRegion, 1000);

            // If locationId is provided, try to find and select that marker
            if (params.locationId) {
              setTimeout(() => {
                const locationIndex = locations.findIndex(
                  (loc) => loc.id === params.locationId
                );
                if (locationIndex !== -1) {
                  handleMarkerPress(locationIndex);
                }
              }, 1200);
            }
          }
        }, 300);
      }
    }
  }, [params.lat, params.lon, params.locationId, locations]);

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

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        {locationNotice && (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>{locationNotice}</Text>
            {canOpenLocationSettings && (
              <TouchableOpacity onPress={() => Linking.openSettings()}>
                <Text style={styles.noticeAction}>Open Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <MapView
          ref={mapRef}
          provider={
            Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
          }
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
            Keyboard.dismiss();
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
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  noticeBanner: {
    position: "absolute" as const,
    top: t.spacing.md,
    left: t.spacing.md,
    right: t.spacing.md,
    zIndex: 10,
    backgroundColor: t.colors.overlay,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    gap: 6,
  },
  noticeText: {
    color: t.colors.textOnImage,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeAction: {
    color: t.colors.accent,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  markerContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  bottomSheet: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.lg,
    borderTopRightRadius: t.radius.lg,
    ...t.elevation.raised,
    shadowOffset: { width: 0, height: -2 },
  },
  dragIndicatorContainer: {
    alignItems: "center" as const,
    paddingVertical: t.spacing.sm,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.borderStrong,
  },
}));

export default Map;

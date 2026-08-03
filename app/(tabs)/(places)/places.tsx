import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  StyleSheet,
  Keyboard,
  Platform,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import MapView from "@/components/map/ClusteredMap";
import {
  Region,
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import * as Location from "expo-location";
import * as Device from "expo-device";
import { mapStyle } from "@/assets/mapStyle";
import { supabase } from "@/utils/supabase";
import LocationPin from "@/components/map/locationPin";
import LocationDetails from "@/components/map/locationDetails";
import {
  getRegularsByLocation,
  type Regular,
} from "@/services/regularsService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";
import Search from "@/components/map/search";
import { fonts, makeStyles } from "@/theme";
import { reportError } from "@/utils/log";

const LOWER_LONSDALE_COORDINATES = {
  latitude: 49.3104,
  longitude: -123.0815,
};

const INITIAL_REGION: Region = {
  ...LOWER_LONSDALE_COORDINATES,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const SHEET_HEIGHT = 390;
const FETCH_DEBOUNCE_MS = 250;
const FETCH_PADDING = 0.35;

interface MapLocation {
  id: number | string;
  name: string;
  address?: string | null;
  lat: number;
  long: number;
  rating?: number | null;
  taste_avg?: number | null;
  presentation_avg?: number | null;
  total_ratings?: number | null;
  regulars?: Regular[];
}

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLong: number;
  maxLong: number;
}

const getBounds = (region: Region, padding = 0): MapBounds => {
  const latitudeRadius = region.latitudeDelta * (0.5 + padding);
  const longitudeRadius = region.longitudeDelta * (0.5 + padding);

  return {
    minLat: region.latitude - latitudeRadius,
    maxLat: region.latitude + latitudeRadius,
    minLong: region.longitude - longitudeRadius,
    maxLong: region.longitude + longitudeRadius,
  };
};

const containsBounds = (outer: MapBounds, inner: MapBounds) =>
  outer.minLat <= inner.minLat &&
  outer.maxLat >= inner.maxLat &&
  outer.minLong <= inner.minLong &&
  outer.maxLong >= inner.maxLong;

function Map() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const searchRef = useRef<any>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [locationResolved, setLocationResolved] = useState(false);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [canOpenLocationSettings, setCanOpenLocationSettings] =
    useState<boolean>(false);
  const mapRef = useRef<any>(null);
  const mapHeightRef = useRef(0);
  const regionRef = useRef<Region>(INITIAL_REGION);
  const fetchedBoundsRef = useRef<MapBounds | null>(null);
  const fetchRequestRef = useRef(0);
  const openedRouteLocationRef = useRef<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<
    MapLocation["id"] | null
  >(null);
  const sheetRef = useRef<BottomSheet>(null);

  const selectedLocation = useMemo(
    () =>
      locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const handleMarkerPress = useCallback((location: MapLocation) => {
    const mapHeight = mapHeightRef.current;
    const sheetLatitudeOffset =
      mapHeight > 0
        ? regionRef.current.latitudeDelta * (SHEET_HEIGHT / (2 * mapHeight))
        : 0;
    const centeredRegion = {
      ...regionRef.current,
      latitude: location.lat - sheetLatitudeOffset,
      longitude: location.long,
    };

    regionRef.current = centeredRegion;
    mapRef.current?.animateToRegion(centeredRegion, 350);
    setSelectedLocationId(location.id);
    sheetRef.current?.snapToIndex(0);
  }, []);

  const onRegionChangeComplete = useCallback((newRegion: Region) => {
    regionRef.current = newRegion;
    setRegion(newRegion);
  }, []);

  /** A search hit recentres the map; the pins for it arrive with the region. */
  const handleSearchPlaceSelected = useCallback((newRegion: Region) => {
    Keyboard.dismiss();
    regionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion, 350);
  }, []);

  const markerElements = useMemo(
    () =>
      locations.map((location) => (
        <Marker
          key={location.id}
          coordinate={{ latitude: location.lat, longitude: location.long }}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
          stopPropagation
          onPress={() => handleMarkerPress(location)}
        >
          <LocationPin loc={location} />
        </Marker>
      )),
    [handleMarkerPress, locations]
  );

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
        const coordinates =
          __DEV__ && !Device.isDevice
            ? LOWER_LONSDALE_COORDINATES
            : (await Location.getCurrentPositionAsync({})).coords;
        const initial = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        regionRef.current = initial;
        setRegion(initial);
        mapRef.current?.animateToRegion(initial, 1000);
      } catch (error) {
        reportError("Error getting location:", error);
        setLocationNotice("We couldn't determine your location.");
      } finally {
        setLocationResolved(true);
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
        const animationTimer = setTimeout(() => {
          regionRef.current = targetRegion;
          setRegion(targetRegion);
          mapRef.current?.animateToRegion(targetRegion, 1000);
        }, 300);

        return () => clearTimeout(animationTimer);
      }
    }
  }, [params.lat, params.lon]);

  useEffect(() => {
    if (!params.locationId) {
      openedRouteLocationRef.current = null;
      return;
    }

    const routeLocationId = String(params.locationId);
    if (openedRouteLocationRef.current === routeLocationId) return;

    const target = locations.find(
      (location) => String(location.id) === routeLocationId
    );
    if (!target) return;

    const openTimer = setTimeout(() => {
      openedRouteLocationRef.current = routeLocationId;
      handleMarkerPress(target);
    }, 0);

    return () => clearTimeout(openTimer);
  }, [handleMarkerPress, locations, params.locationId]);

  useEffect(() => {
    if (!locationResolved) return;

    const visibleBounds = getBounds(region);
    if (
      fetchedBoundsRef.current &&
      containsBounds(fetchedBoundsRef.current, visibleBounds)
    ) {
      return;
    }

    const queryBounds = getBounds(region, FETCH_PADDING);
    const requestId = ++fetchRequestRef.current;

    const fetchTimer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("locations_in_view", {
        min_lat: queryBounds.minLat,
        min_long: queryBounds.minLong,
        max_lat: queryBounds.maxLat,
        max_long: queryBounds.maxLong,
      });

      if (requestId !== fetchRequestRef.current) return;

      if (error) {
        reportError("Error fetching locations in view:", error);
      } else {
        const nextLocations = (data ?? []).filter(
          (location: MapLocation) =>
            Number.isFinite(location.lat) && Number.isFinite(location.long)
        );
        fetchedBoundsRef.current = queryBounds;
        setLocations(nextLocations);

        try {
          const regularsByLocation = await getRegularsByLocation(
            nextLocations.map((location: MapLocation) => location.id)
          );
          if (requestId !== fetchRequestRef.current) return;
          setLocations(
            nextLocations.map((location: MapLocation) => ({
              ...location,
              regulars: regularsByLocation.get(String(location.id)) ?? [],
            }))
          );
        } catch (regularsError) {
          reportError("Error fetching map regulars:", regularsError);
        }
      }
    }, FETCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(fetchTimer);
      if (fetchRequestRef.current === requestId) {
        fetchRequestRef.current += 1;
      }
    };
  }, [locationResolved, region]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {/* Every tab root wears the same green header: the screen's name in the
          display cut, then the search field on the ink. The map used to start
          under the status bar with nothing naming the screen at all. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>places</Text>
        <Search
          ref={searchRef}
          onPlaceSelected={handleSearchPlaceSelected}
          currentLocation={{
            latitude: region.latitude,
            longitude: region.longitude,
          }}
        />
      </View>
      <View
        style={{ flex: 1 }}
        onLayout={(event) => {
          mapHeightRef.current = event.nativeEvent.layout.height;
        }}
      >
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
        {locationResolved ? (
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
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            customMapStyle={mapStyle}
            onPress={() => {
              Keyboard.dismiss();
              if (selectedLocationId !== null) {
                sheetRef.current?.close();
              }
            }}
          >
            {markerElements}
          </MapView>
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="small" />
          </View>
        )}
        {/* No backdrop on purpose: the map has to stay interactive while the
            sheet is up, and tapping the map already dismisses it. */}
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={[SHEET_HEIGHT]}
          enableDynamicSizing={false}
          enablePanDownToClose
          onClose={() => setSelectedLocationId(null)}
          style={styles.sheetShadow}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <BottomSheetScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            {selectedLocation && <LocationDetails loc={selectedLocation} />}
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // No background of its own: the map renders at a negative z-index, so
  // anything painted here would cover it.
  screen: {
    flex: 1,
  },
  header: {
    backgroundColor: t.colors.surfaceInk,
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.md,
    gap: t.spacing.xs,
  },
  // Lowercase, black weight, tight — the wordmark's own voice, and the same
  // treatment every other tab root's title takes.
  headerTitle: {
    ...t.typography.display,
    fontSize: 30,
    lineHeight: 32,
    color: t.colors.onInk,
    paddingHorizontal: t.spacing.sm,
  },
  mapLoading: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.background,
  },
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
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  noticeAction: {
    color: t.colors.accent,
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  markerContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  sheetShadow: {
    ...t.elevation.raised,
    shadowOffset: { width: 0, height: -2 },
  },
  sheetBackground: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: t.colors.borderStrong,
  },
  sheetContent: {
    paddingBottom: t.spacing.xl,
  },
}));

export default Map;

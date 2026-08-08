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
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import MapView from "@/components/map/ClusteredMap";
import {
  Region,
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import * as Location from "expo-location";
import * as Device from "expo-device";
import { darkMapStyle, mapStyle } from "@/assets/mapStyle";
import { supabase } from "@/utils/supabase";
import LocationPin from "@/components/map/locationPin";
import LocationDetails from "@/components/map/locationDetails";
import { withRegulars, type Regular } from "@/services/regularsService";
import RegularsSlider from "@/components/RegularsSlider";
import { useLocalSearchParams } from "expo-router";
import Search from "@/components/map/search";
import AppHeader from "@/components/nav/AppHeader";
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError, warn } from "@/utils/log";
import { getScreenshotSeed } from "@/utils/screenshotMode";
import {
  getClusterPressRegion,
  type ClusterCoordinate,
} from "@/utils/mapClusterRegion";

const LOWER_LONSDALE_COORDINATES = {
  latitude: 49.3104,
  longitude: -123.0815,
};

const INITIAL_REGION: Region = {
  ...LOWER_LONSDALE_COORDINATES,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const SHEET_HEIGHT = 240;
const FETCH_DEBOUNCE_MS = 250;
const FETCH_PADDING = 0.35;
const CLUSTER_FIT_PADDING = 1.8;
const CLUSTER_MIN_DELTA = 0.008;
const CLUSTER_FALLBACK_ZOOM = 0.4;
const MARKER_PRESS_GUARD_MS = 250;
const ROUTE_LOCATION_FOCUS_DELTA = 0.001;

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

const ClusterPin = ({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) => {
  const styles = useStyles();
  const size = count >= 25 ? 66 : count >= 10 ? 58 : 48;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      onPress={onPress}
      style={[
        styles.clusterPin,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.clusterCount}>{count}</Text>
    </TouchableOpacity>
  );
};

const UserDot = () => {
  const styles = useStyles();
  return (
    <View style={styles.userHalo}>
      <View style={styles.userDot} />
    </View>
  );
};

function Map() {
  const styles = useStyles();
  const { isDark } = useTheme();
  const params = useLocalSearchParams();
  const screenshotSeed = getScreenshotSeed(
    params.screenshotSeed as string | string[] | undefined
  );
  const isScreenshotMap =
    screenshotSeed === "map" || screenshotSeed === "place";
  const searchRef = useRef<any>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [locationResolved, setLocationResolved] = useState(false);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [userCoordinate, setUserCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [canOpenLocationSettings, setCanOpenLocationSettings] =
    useState<boolean>(false);
  const mapRef = useRef<any>(null);
  const mapHeightRef = useRef(0);
  const regionRef = useRef<Region>(INITIAL_REGION);
  const fetchedBoundsRef = useRef<MapBounds | null>(null);
  const fetchRequestRef = useRef(0);
  const openedRouteLocationRef = useRef<string | null>(null);
  const markerPressGuardRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<
    MapLocation["id"] | null
  >(null);
  const [regularsSheetOpen, setRegularsSheetOpen] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);

  const selectedLocation = useMemo(
    () =>
      locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const handleMarkerPress = useCallback(
    (location: MapLocation, focusDelta?: number) => {
      if (markerPressGuardRef.current) {
        clearTimeout(markerPressGuardRef.current);
      }
      markerPressGuardRef.current = setTimeout(() => {
        markerPressGuardRef.current = null;
      }, MARKER_PRESS_GUARD_MS);

      const mapHeight = mapHeightRef.current;
      const baseRegion = focusDelta
        ? {
            latitude: location.lat,
            longitude: location.long,
            latitudeDelta: focusDelta,
            longitudeDelta: focusDelta,
          }
        : regionRef.current;
      const sheetLatitudeOffset =
        mapHeight > 0
          ? baseRegion.latitudeDelta * (SHEET_HEIGHT / (2 * mapHeight))
          : 0;
      const centeredRegion = {
        ...baseRegion,
        latitude: location.lat - sheetLatitudeOffset,
        longitude: location.long,
      };

      regionRef.current = centeredRegion;
      mapRef.current?.animateToRegion(centeredRegion, 350);
      setRegularsSheetOpen(false);
      setSelectedLocationId(location.id);
    },
    []
  );

  useEffect(() => {
    if (selectedLocation) {
      sheetRef.current?.snapToIndex(0);
    }
  }, [selectedLocation]);

  useEffect(
    () => () => {
      if (markerPressGuardRef.current) {
        clearTimeout(markerPressGuardRef.current);
      }
    },
    []
  );

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

  const handleClusterPress = useCallback((_cluster: any, children?: any[]) => {
    const coordinates =
      children
        ?.map((child) => child.geometry?.coordinates)
        .filter(
          (coordinate): coordinate is ClusterCoordinate =>
            Array.isArray(coordinate) &&
            Number.isFinite(coordinate[0]) &&
            Number.isFinite(coordinate[1])
        ) ?? [];

    const nextRegion = getClusterPressRegion({
      childCoordinates: coordinates,
      clusterCoordinate: _cluster?.geometry?.coordinates,
      currentRegion: regionRef.current,
      fitPadding: CLUSTER_FIT_PADDING,
      minDelta: CLUSTER_MIN_DELTA,
      fallbackZoom: CLUSTER_FALLBACK_ZOOM,
    });

    if (!nextRegion) return;

    Keyboard.dismiss();
    setSelectedLocationId(null);
    setRegularsSheetOpen(false);
    sheetRef.current?.close();

    regionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 350);
  }, []);

  const markerElements = useMemo(
    () =>
      locations.map((location) => {
        const isSelected = String(location.id) === String(selectedLocationId);

        return (
          <Marker
            key={`${location.id}-${isSelected ? "selected" : "idle"}`}
            coordinate={{ latitude: location.lat, longitude: location.long }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            stopPropagation
            zIndex={isSelected ? 10 : 1}
            onPress={() => handleMarkerPress(location)}
          >
            <LocationPin loc={location} selected={isSelected} />
          </Marker>
        );
      }),
    [handleMarkerPress, locations, selectedLocationId]
  );

  const renderCluster = useCallback((cluster: any) => {
    const [longitude, latitude] = cluster.geometry.coordinates;
    const count = cluster.properties.point_count;
    const handlePress = () => {
      cluster.onPress?.();
    };

    return (
      <Marker
        key={`cluster-${cluster.id}`}
        coordinate={{ latitude, longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
        onPress={handlePress}
        tappable
        stopPropagation
        zIndex={5}
      >
        <ClusterPin count={count} onPress={handlePress} />
      </Marker>
    );
  }, []);

  useEffect(() => {
    const getLocation = async () => {
      if (isScreenshotMap) {
        const latitude =
          Number(params.lat) || LOWER_LONSDALE_COORDINATES.latitude;
        const longitude =
          Number(params.lon) || LOWER_LONSDALE_COORDINATES.longitude;
        const initial = {
          latitude,
          longitude,
          latitudeDelta: screenshotSeed === "place" ? 0.012 : 0.018,
          longitudeDelta: screenshotSeed === "place" ? 0.012 : 0.018,
        };

        setLocationNotice(null);
        setCanOpenLocationSettings(false);
        setUserCoordinate(null);
        regionRef.current = initial;
        setRegion(initial);
        setLocationResolved(true);
        return;
      }

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
        setUserCoordinate({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });
        regionRef.current = initial;
        setRegion(initial);
        mapRef.current?.animateToRegion(initial, 1000);
      } catch (error) {
        warn("Current location unavailable; showing the default map.", error);
        setLocationNotice("We couldn't determine your location.");
      } finally {
        setLocationResolved(true);
      }
    };

    getLocation();
  }, [isScreenshotMap, params.lat, params.lon, screenshotSeed]);

  // Handle navigation to specific location from Location component
  useEffect(() => {
    if (params.lat && params.lon) {
      const lat = parseFloat(params.lat as string);
      const lon = parseFloat(params.lon as string);

      if (!isNaN(lat) && !isNaN(lon)) {
        const targetRegion: Region = {
          latitude: lat,
          longitude: lon,
          latitudeDelta: ROUTE_LOCATION_FOCUS_DELTA,
          longitudeDelta: ROUTE_LOCATION_FOCUS_DELTA,
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
      handleMarkerPress(target, ROUTE_LOCATION_FOCUS_DELTA);
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
        const nextLocations: MapLocation[] = (data ?? []).filter(
          (location: MapLocation) =>
            Number.isFinite(location.lat) && Number.isFinite(location.long)
        );
        fetchedBoundsRef.current = queryBounds;
        setLocations(nextLocations);

        try {
          const withTheirRegulars = await withRegulars(nextLocations);
          if (requestId !== fetchRequestRef.current) return;
          setLocations(withTheirRegulars);
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
      <AppHeader
        variant="large"
        title="Places"
        below={
          <Search
            ref={searchRef}
            onPlaceSelected={handleSearchPlaceSelected}
            currentLocation={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
          />
        }
      />
      <View
        style={styles.mapFrame}
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
            mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
            userInterfaceStyle={isDark ? "dark" : "light"}
            clusteringEnabled={true}
            preserveClusterPressBehavior
            onClusterPress={handleClusterPress}
            renderCluster={renderCluster}
            style={StyleSheet.absoluteFill}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsPointsOfInterests={false}
            showsBuildings={false}
            rotateEnabled={false}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            customMapStyle={isDark ? darkMapStyle : mapStyle}
            onPress={() => {
              if (markerPressGuardRef.current) {
                clearTimeout(markerPressGuardRef.current);
                markerPressGuardRef.current = null;
                return;
              }

              Keyboard.dismiss();
              if (selectedLocationId !== null) {
                setRegularsSheetOpen(false);
                sheetRef.current?.close();
              }
            }}
          >
            {userCoordinate ? (
              <Marker
                coordinate={userCoordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <UserDot />
              </Marker>
            ) : null}
            {markerElements}
          </MapView>
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="small" />
          </View>
        )}
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={[SHEET_HEIGHT]}
          enableDynamicSizing={false}
          enablePanDownToClose
          onClose={() => {
            setRegularsSheetOpen(false);
            setSelectedLocationId(null);
          }}
          style={styles.sheetShadow}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <BottomSheetView style={styles.sheetContent}>
            {selectedLocation && (
              <LocationDetails
                loc={selectedLocation}
                onRegularsPress={() => setRegularsSheetOpen(true)}
              />
            )}
          </BottomSheetView>
        </BottomSheet>
        {regularsSheetOpen && selectedLocation?.regulars?.length ? (
          <RegularsSlider
            regulars={selectedLocation.regulars.slice(0, 3)}
            locationName={selectedLocation.name}
            onClose={() => setRegularsSheetOpen(false)}
          />
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  mapFrame: {
    flex: 1,
    overflow: "hidden" as const,
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
    ...t.typography.caption,
    color: t.colors.textOnImage,
  },
  noticeAction: {
    ...t.typography.caption,
    color: t.colors.accent,
    fontFamily: fonts.bold,
  },
  markerContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  clusterPin: {
    backgroundColor: t.colors.surfaceBrand,
    borderWidth: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    ...t.elevation.raised,
  },
  clusterCount: {
    ...t.typography.heading,
    position: "absolute" as const,
    color: t.colors.onAccentTonal,
    fontFamily: fonts.black,
    lineHeight: 20,
    textAlign: "center" as const,
    fontVariant: ["tabular-nums"] as const,
  },
  userHalo: {
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(232, 118, 61, 0.22)",
  },
  userDot: {
    width: 20,
    height: 20,
    borderRadius: t.radius.pill,
    borderWidth: 4,
    borderColor: t.colors.surface,
    backgroundColor: t.colors.ratingPipDot,
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
    flex: 1,
    paddingHorizontal: t.spacing.sheetGutter,
    paddingBottom: t.spacing.lg,
  },
}));

export default Map;

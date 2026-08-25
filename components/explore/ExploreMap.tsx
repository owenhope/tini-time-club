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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView from "@/components/map/ClusteredMap";
import {
  Region,
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { darkMapStyle, mapStyle } from "@/assets/mapStyle";
import { supabase } from "@/utils/supabase";
import LocationPin from "@/components/map/locationPin";
import LocationDetails from "@/components/map/locationDetails";
import { withRegulars, type Regular } from "@/services/regularsService";
import RegularsSlider from "@/components/RegularsSlider";
import Search from "@/components/map/search";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";
import { getScreenshotSeed } from "@/utils/screenshotMode";
import {
  getClusterPressRegion,
  type ClusterCoordinate,
} from "@/utils/mapClusterRegion";
import {
  EXPLORE_DEFAULT_COORDINATES,
  type ExploreLocationState,
} from "@/components/explore/useExploreLocation";
import { ExploreSearchArea } from "@/components/explore/ExploreSearchField";
import { useProfile } from "@/context/profile-context";
import { useMembership } from "@/context/membership-context";
import { publicContentService } from "@/services/public-content-service";
import { getMarkerFocusRegion } from "@/utils/mapMarkerFocus";
import { canOpenMapPinDetails } from "@/utils/mapPinAccess";
import type { ExploreRegion } from "@/services/regionService";
import { mergeMapLocations, normalizeMapLocations } from "@/utils/mapLocations";

const INITIAL_REGION: Region = {
  ...EXPLORE_DEFAULT_COORDINATES,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const ESTIMATED_LOCATION_SHEET_CONTENT_HEIGHT = 176;
const FETCH_DEBOUNCE_MS = 250;
const FETCH_PADDING = 0.35;
const CLUSTER_FIT_PADDING = 1.8;
const CLUSTER_MIN_DELTA = 0.002;
const CLUSTER_FALLBACK_ZOOM = 0.4;
const MARKER_PRESS_GUARD_MS = 250;
const ROUTE_LOCATION_FOCUS_DELTA = 0.001;

export interface ExploreMapFocus {
  lat?: string;
  lon?: string;
  locationId?: string;
  screenshotSeed?: string;
}

interface ExploreMapProps {
  enabled: boolean;
  focus: ExploreMapFocus;
  location: ExploreLocationState;
  requestLocation: () => Promise<void>;
  exploreRegion: ExploreRegion | null;
}

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
  is_golden_glass?: boolean;
}

const toMapLocation = (location: any): MapLocation => ({
  ...location,
  long: location.long ?? location.lon,
});

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

const ClusterPin = ({ count }: { count: number }) => {
  const styles = useStyles();
  const size = count >= 25 ? 66 : count >= 10 ? 58 : 48;

  return (
    <View
      pointerEvents="none"
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
    </View>
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

function ExploreMap({
  enabled,
  focus,
  location,
  requestLocation,
  exploreRegion,
}: ExploreMapProps) {
  const styles = useStyles();
  const { isDark, spacing } = useTheme();
  const { profile } = useProfile();
  const { requireMembership } = useMembership();
  const safeAreaInsets = useSafeAreaInsets();
  const tabBarContentInset = useNativeTabBarContentInset();
  const sheetBottomInset = Math.max(
    0,
    tabBarContentInset - safeAreaInsets.bottom - spacing.xl
  );
  const screenshotSeed = getScreenshotSeed(focus.screenshotSeed);
  const isScreenshotMap =
    screenshotSeed === "map" || screenshotSeed === "place";
  const searchRef = useRef<any>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [locationResolved, setLocationResolved] = useState(false);
  const [locationsReady, setLocationsReady] = useState(false);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [mapRevision, setMapRevision] = useState(0);
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
  const centeredRegionIdRef = useRef<number | null | undefined>(undefined);
  const openedRouteLocationRef = useRef<string | null>(null);
  const focusedCoordinatesRef = useRef<string | null>(null);
  const initialLocationAppliedRef = useRef(false);
  const screenshotFocusRef = useRef<string | null>(null);
  const markerPressGuardRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<
    MapLocation["id"] | null
  >(null);
  const [regularsSheetOpen, setRegularsSheetOpen] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);
  const measuredSheetHeightRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(enabled);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      // react-native-map-clustering derives its native marker list from the
      // children array. Re-key the marker batch when returning from a list so
      // the native map refreshes immediately instead of waiting for a gesture.
      setMapRevision((revision) => revision + 1);
    }
    wasEnabledRef.current = enabled;
  }, [enabled]);

  const selectedLocation = useMemo(
    () =>
      locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const handleMarkerPress = useCallback(
    (location: MapLocation, focusDelta?: number) => {
      // Gate before any selection, camera movement, or detail-sheet render.
      if (!canOpenMapPinDetails(Boolean(profile))) {
        requireMembership("location-details");
        return;
      }
      if (markerPressGuardRef.current) {
        clearTimeout(markerPressGuardRef.current);
      }
      markerPressGuardRef.current = setTimeout(() => {
        markerPressGuardRef.current = null;
      }, MARKER_PRESS_GUARD_MS);

      const mapHeight = mapHeightRef.current;
      const sheetCoveredHeight =
        measuredSheetHeightRef.current ??
        ESTIMATED_LOCATION_SHEET_CONTENT_HEIGHT + sheetBottomInset;
      const baseRegion = focusDelta
        ? {
            latitude: location.lat,
            longitude: location.long,
            latitudeDelta: focusDelta,
            longitudeDelta: focusDelta,
          }
        : regionRef.current;
      const centeredRegion = getMarkerFocusRegion({
        location: { latitude: location.lat, longitude: location.long },
        region: baseRegion,
        mapHeight,
        coveredHeight: sheetCoveredHeight,
      });

      regionRef.current = centeredRegion;
      mapRef.current?.animateToRegion(centeredRegion, 350);
      setRegularsSheetOpen(false);
      setSelectedLocationId(location.id);
    },
    [profile, requireMembership, sheetBottomInset]
  );

  const handleSheetContentLayout = useCallback(() => {
    if (!selectedLocation) return;

    // Dynamic sizing receives the content measurement in BottomSheetView's
    // own layout handler. Open on the following frame so that detent exists.
    requestAnimationFrame(() => sheetRef.current?.expand());
  }, [selectedLocation]);

  const handleSheetChange = useCallback((index: number, position: number) => {
    if (index < 0 || mapHeightRef.current <= 0) return;
    measuredSheetHeightRef.current = Math.max(
      0,
      mapHeightRef.current - position
    );
  }, []);

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
            key={`${String(location.id)}-${mapRevision}`}
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
    [handleMarkerPress, locations, mapRevision, selectedLocationId]
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
        <ClusterPin count={count} />
      </Marker>
    );
  }, []);

  useEffect(() => {
    if (!enabled || !isScreenshotMap) return;

    const focusKey = `${screenshotSeed}:${focus.lat ?? ""}:${focus.lon ?? ""}`;
    if (screenshotFocusRef.current === focusKey) return;
    screenshotFocusRef.current = focusKey;

    const latitude = Number(focus.lat) || EXPLORE_DEFAULT_COORDINATES.latitude;
    const longitude =
      Number(focus.lon) || EXPLORE_DEFAULT_COORDINATES.longitude;
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
  }, [enabled, focus.lat, focus.lon, isScreenshotMap, screenshotSeed]);

  useEffect(() => {
    if (!enabled || isScreenshotMap) return;
    if (!exploreRegion) {
      centeredRegionIdRef.current = null;
      initialLocationAppliedRef.current = false;
      setLocationResolved(false);
      setLocationsReady(false);
      setLocations([]);
      fetchedBoundsRef.current = null;
      setLocationNotice(null);
      return;
    }
    if (centeredRegionIdRef.current === exploreRegion.id) return;
    centeredRegionIdRef.current = exploreRegion.id;

    const nextRegion: Region = {
      latitude: exploreRegion.center.latitude,
      longitude: exploreRegion.center.longitude,
      latitudeDelta: Math.max(
        0.02,
        (exploreRegion.catchmentRadiusMeters / 111_320) * 2
      ),
      longitudeDelta: Math.max(
        0.02,
        (exploreRegion.catchmentRadiusMeters /
          (111_320 *
            Math.max(
              0.2,
              Math.cos((exploreRegion.center.latitude * Math.PI) / 180)
            ))) *
          2
      ),
    };
    regionRef.current = nextRegion;
    setRegion(nextRegion);
    setLocationNotice(null);
    setLocationResolved(true);
    setLocationsReady(false);
    setLocations([]);
    fetchedBoundsRef.current = null;
    mapRef.current?.animateToRegion(nextRegion, 500);
  }, [enabled, exploreRegion, isScreenshotMap]);

  useEffect(() => {
    if (enabled && !isScreenshotMap && location.status === "idle") {
      void requestLocation();
    }
  }, [enabled, isScreenshotMap, location.status, requestLocation]);

  useEffect(() => {
    if (
      !enabled ||
      isScreenshotMap ||
      exploreRegion ||
      initialLocationAppliedRef.current ||
      location.status === "idle" ||
      location.status === "loading"
    ) {
      return;
    }

    initialLocationAppliedRef.current = true;
    setLocationResolved(true);

    if (location.status === "denied") {
      setLocationNotice(
        location.canOpenSettings
          ? "Location is off. Enable it in Settings to see bars near you."
          : "Location is off, so we can't show bars near you."
      );
      setCanOpenLocationSettings(location.canOpenSettings);
      return;
    }

    if (location.status === "unavailable") {
      setLocationNotice("We couldn't determine your location.");
      return;
    }

    if (location.status !== "ready") return;

    setLocationNotice(null);
    setCanOpenLocationSettings(false);
    setUserCoordinate(location.coordinates);

    // A routed venue focus wins over the user's current position.
    if (focus.lat && focus.lon) return;

    const initial = {
      ...location.coordinates,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    regionRef.current = initial;
    setRegion(initial);
    mapRef.current?.animateToRegion(initial, 1000);
  }, [enabled, exploreRegion, focus.lat, focus.lon, isScreenshotMap, location]);

  // Handle navigation to specific location from Location component
  useEffect(() => {
    if (!enabled || !focus.lat || !focus.lon) return;

    const focusKey = `${focus.lat}:${focus.lon}`;
    if (focusedCoordinatesRef.current === focusKey) return;

    const lat = parseFloat(focus.lat);
    const lon = parseFloat(focus.lon);

    if (!isNaN(lat) && !isNaN(lon)) {
      focusedCoordinatesRef.current = focusKey;
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
  }, [enabled, focus.lat, focus.lon]);

  useEffect(() => {
    if (!enabled || !focus.locationId) {
      openedRouteLocationRef.current = null;
      return;
    }

    const routeLocationId = String(focus.locationId);
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
  }, [enabled, focus.locationId, handleMarkerPress, locations]);

  useEffect(() => {
    if (!enabled || !locationResolved) return;

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
      const { data, error } = profile
        ? await supabase.rpc("locations_in_view", {
            min_lat: queryBounds.minLat,
            min_long: queryBounds.minLong,
            max_lat: queryBounds.maxLat,
            max_long: queryBounds.maxLong,
          })
        : await publicContentService
            .getLocationsInView({
              minLat: queryBounds.minLat,
              minLong: queryBounds.minLong,
              maxLat: queryBounds.maxLat,
              maxLong: queryBounds.maxLong,
            })
            .then((data) => ({ data, error: null }))
            .catch((error) => ({ data: null, error }));

      if (requestId !== fetchRequestRef.current) return;

      if (error) {
        reportError("Error fetching locations in view:", error);
        setLocationsReady(true);
      } else {
        let rawLocations = (data ?? []).map(toMapLocation) as MapLocation[];

        // A venue opened from its detail screen may be outside the selected
        // Explore region. The viewport RPC intentionally filters by region,
        // so load the routed venue directly to guarantee the map can show it.
        if (
          focus.locationId &&
          !rawLocations.some(
            (location) => String(location.id) === String(focus.locationId)
          )
        ) {
          try {
            const focused = profile
              ? await supabase
                  .from("location_ratings")
                  .select(
                    "id,name,address,lat,lon,rating,taste_avg,presentation_avg,total_ratings,is_golden_glass"
                  )
                  .eq("id", focus.locationId)
                  .maybeSingle()
              : await publicContentService
                  .getLocation(focus.locationId)
                  .then((focused) => ({ data: focused, error: null }))
                  .catch((error) => ({ data: null, error }));

            if (!focused.error && focused.data) {
              rawLocations = [...rawLocations, toMapLocation(focused.data)];
            }
          } catch (focusedError) {
            reportError("Error fetching routed map location:", focusedError);
          }
        }

        const missingAwardIds = rawLocations
          .filter((location) => location.is_golden_glass == null)
          .map((location) => Number(location.id))
          .filter((id) => Number.isFinite(id));
        let locationsWithAwards = rawLocations;
        if (missingAwardIds.length > 0) {
          const { data: awards } = await supabase
            .from("location_ratings")
            .select("id,is_golden_glass")
            .in("id", missingAwardIds);
          if (requestId !== fetchRequestRef.current) return;
          const awardsByLocation = new Map(
            (awards ?? []).map((row) => [
              String(row.id),
              Boolean(row.is_golden_glass),
            ])
          );
          locationsWithAwards = rawLocations.map((location) => ({
            ...location,
            is_golden_glass:
              location.is_golden_glass ??
              awardsByLocation.get(String(location.id)) ??
              false,
          }));
        }
        const nextLocations = normalizeMapLocations(
          locationsWithAwards
        ) as MapLocation[];
        fetchedBoundsRef.current = queryBounds;
        let committedLocations = nextLocations;
        try {
          const withTheirRegulars = await withRegulars(nextLocations);
          if (requestId !== fetchRequestRef.current) return;
          committedLocations = withTheirRegulars;
        } catch (regularsError) {
          reportError("Error fetching map regulars:", regularsError);
        }

        if (requestId !== fetchRequestRef.current) return;
        // Publish one complete marker batch. Mounting an empty clustered map
        // and then replacing it during Fabric reconciliation can crash iOS.
        setLocations((currentLocations) =>
          mergeMapLocations(currentLocations, committedLocations)
        );
        setMapRevision((revision) => revision + 1);
        setLocationsReady(true);
      }
    }, FETCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(fetchTimer);
      if (fetchRequestRef.current === requestId) {
        fetchRequestRef.current += 1;
      }
    };
  }, [
    enabled,
    exploreRegion?.id,
    focus.locationId,
    locationResolved,
    profile,
    region,
  ]);

  return (
    <View style={styles.screen}>
      <ExploreSearchArea>
        <Search
          ref={searchRef}
          onPlaceSelected={handleSearchPlaceSelected}
          currentLocation={{
            latitude: region.latitude,
            longitude: region.longitude,
          }}
        />
      </ExploreSearchArea>
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
        {locationResolved && locationsReady ? (
          <MapView
            ref={mapRef}
            provider={
              Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
            }
            mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
            userInterfaceStyle={isDark ? "dark" : "light"}
            clusteringEnabled={true}
            animationEnabled
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
        {selectedLocation ? (
          <View
            pointerEvents="none"
            style={[styles.sheetTabBarUnderlay, { height: sheetBottomInset }]}
          />
        ) : null}
        <BottomSheet
          ref={sheetRef}
          index={-1}
          enableDynamicSizing
          enablePanDownToClose
          bottomInset={sheetBottomInset}
          onChange={handleSheetChange}
          onClose={() => {
            setRegularsSheetOpen(false);
            setSelectedLocationId(null);
          }}
          style={styles.sheetShadow}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <BottomSheetView
            onLayout={handleSheetContentLayout}
            style={styles.sheetContent}
          >
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
    ...t.typography.label,
    color: t.colors.accent,
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
  sheetTabBarUnderlay: {
    position: "absolute" as const,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: t.colors.surface,
  },
  sheetContent: {
    paddingHorizontal: t.spacing.sheetGutter,
    paddingBottom: t.spacing.xxl,
  },
}));

export default ExploreMap;

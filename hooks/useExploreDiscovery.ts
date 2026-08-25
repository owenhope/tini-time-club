import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDiscoverLocationsPage,
  getDiscoverProfilesPage,
  type DiscoveredLocation,
  type DiscoveredProfile,
  type DiscoveryCursor,
} from "@/services/discoveryService";
import type { ExploreLocationState } from "@/components/explore/useExploreLocation";
import type { Regular } from "@/services/regularsService";
import { reportError } from "@/utils/log";

const DISCOVERY_PAGE_SIZE = 25;

export type ExploreLocationItem = Omit<
  DiscoveredLocation,
  "rating" | "regulars"
> & {
  latitude: number | null;
  longitude: number | null;
  rating?: number;
  regulars: Regular[];
};

interface UseExploreDiscoveryOptions {
  enabled: boolean;
  activeView: "profiles" | "locations";
  query: string;
  location: ExploreLocationState;
  requestLocation: () => Promise<void>;
}

export function useExploreDiscovery({
  enabled,
  activeView,
  query,
  location,
  requestLocation,
}: UseExploreDiscoveryOptions) {
  const [profiles, setProfiles] = useState<DiscoveredProfile[]>([]);
  const [locations, setLocations] = useState<ExploreLocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
  const [hasMoreLocations, setHasMoreLocations] = useState(true);
  const [profileCursor, setProfileCursor] = useState<DiscoveryCursor | null>(
    null
  );
  const [locationCursor, setLocationCursor] = useState<DiscoveryCursor | null>(
    null
  );
  const [nearby, setNearby] = useState(true);
  const profileRequestId = useRef(0);
  const locationRequestId = useRef(0);
  const nearbyEnabled =
    nearby && location.status !== "denied" && location.status !== "unavailable";
  const userLocation =
    location.status === "ready"
      ? location.coordinates
      : location.status === "idle" || location.status === "loading"
        ? undefined
        : null;

  useEffect(() => {
    if (!enabled || activeView !== "profiles") return;

    if (location.status === "idle") {
      void requestLocation();
    }
  }, [activeView, enabled, location.status, nearbyEnabled, requestLocation]);

  const fetchProfiles = useCallback(
    async (searchQuery: string, cursor: DiscoveryCursor | null = null) => {
      const append = cursor !== null;
      const requestId = ++profileRequestId.current;
      if (!append) setLoading(true);
      else setLoadingMore(true);
      try {
        const page = await getDiscoverProfilesPage({
          query: searchQuery,
          cursor,
          limit: DISCOVERY_PAGE_SIZE,
        });
        if (requestId !== profileRequestId.current) return;
        setProfiles((current) =>
          append ? [...current, ...page.items] : page.items
        );
        setProfileCursor(page.nextCursor);
        setHasMoreProfiles(page.hasMore);
      } catch (error) {
        reportError("Error fetching profiles:", error);
        if (requestId !== profileRequestId.current) return;
        if (!append) setProfiles([]);
        setHasMoreProfiles(false);
      } finally {
        if (requestId === profileRequestId.current) {
          if (!append) setLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    []
  );

  const fetchLocations = useCallback(
    async (searchQuery: string, cursor: DiscoveryCursor | null = null) => {
      const append = cursor !== null;
      const requestId = ++locationRequestId.current;
      if (!append) setLoading(true);
      else setLoadingMore(true);
      try {
        const page = await getDiscoverLocationsPage({
          query: searchQuery,
          cursor,
          limit: DISCOVERY_PAGE_SIZE,
          nearby:
            !searchQuery && nearbyEnabled && userLocation
              ? {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  radiusKm: 50,
                }
              : null,
        });
        if (requestId !== locationRequestId.current) return;
        const nextLocations: ExploreLocationItem[] = page.items.map((item) => ({
          ...item,
          latitude: item.lat,
          longitude: item.lon,
          rating:
            item.total_ratings > 0 && item.rating != null
              ? item.rating
              : undefined,
          regulars: item.regulars as Regular[],
        }));
        setLocations((current) =>
          append ? [...current, ...nextLocations] : nextLocations
        );
        setLocationCursor(page.nextCursor);
        setHasMoreLocations(page.hasMore);
      } catch (error) {
        reportError("Error fetching locations:", error);
        if (requestId !== locationRequestId.current) return;
        if (!append) setLocations([]);
        setHasMoreLocations(false);
      } finally {
        if (requestId === locationRequestId.current) {
          if (!append) setLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    [nearbyEnabled, userLocation]
  );

  useEffect(() => {
    if (!enabled) return;

    if (activeView === "profiles") {
      setProfiles([]);
      setProfileCursor(null);
      setHasMoreProfiles(true);
    } else {
      setLocations([]);
      setLocationCursor(null);
      setHasMoreLocations(true);
    }

    // Debounce: without this every keystroke fires its own discovery request.
    const handle = setTimeout(
      () => {
        if (activeView === "profiles") {
          void fetchProfiles(query);
        } else {
          if (nearbyEnabled && userLocation === undefined) return;
          void fetchLocations(query);
        }
      },
      query ? 300 : 0
    );

    return () => clearTimeout(handle);
  }, [
    activeView,
    enabled,
    fetchLocations,
    fetchProfiles,
    query,
    nearbyEnabled,
    userLocation,
  ]);

  const handleEndReached = useCallback(() => {
    if (loading || loadingMore) return;
    if (activeView === "profiles") {
      if (hasMoreProfiles) void fetchProfiles(query, profileCursor);
    } else if (hasMoreLocations) {
      void fetchLocations(query, locationCursor);
    }
  }, [
    activeView,
    fetchLocations,
    fetchProfiles,
    hasMoreLocations,
    hasMoreProfiles,
    loading,
    loadingMore,
    locationCursor,
    profileCursor,
    query,
  ]);

  return {
    profiles,
    locations,
    loading,
    nearbyEnabled,
    toggleNearby: () => setNearby((current) => !current),
    handleEndReached,
  };
}

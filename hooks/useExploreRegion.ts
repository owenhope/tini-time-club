import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reportError } from "@/utils/log";
import {
  findRegionForCoordinates,
  getEnabledRegions,
  getSavedRegionId,
  saveRegion,
  type ExploreRegion,
} from "@/services/regionService";
import type { ExploreLocationState } from "@/components/explore/useExploreLocation";

export type ExploreRegionStatus =
  "loading" | "ready" | "needs-selection" | "unsupported";

export interface ExploreRegionState {
  status: ExploreRegionStatus;
  regions: ExploreRegion[];
  selectedRegion: ExploreRegion | null;
  locationStatus: ExploreLocationState["status"];
}

export function useExploreRegion(
  location: ExploreLocationState,
  requestLocation: () => Promise<void>
): {
  state: ExploreRegionState;
  selectRegion: (region: ExploreRegion) => Promise<void>;
  useMyLocation: () => Promise<void>;
} {
  const [regions, setRegions] = useState<ExploreRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<ExploreRegion | null>(
    null
  );
  const [status, setStatus] = useState<ExploreRegionStatus>("loading");
  const [locationRefresh, setLocationRefresh] = useState(0);
  const resolvedCoordinatesRef = useRef<string | null>(null);
  const manualSelectionRef = useRef(false);
  const resolutionAttemptRef = useRef(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [available, savedId] = await Promise.all([
          getEnabledRegions(),
          getSavedRegionId(),
        ]);
        if (!active) return;
        setRegions(available);
        if (savedId != null) {
          const saved = available.find((region) => region.id === savedId);
          if (saved) {
            setSelectedRegion(saved);
            setStatus("ready");
          }
        }
      } catch (error) {
        reportError("Unable to load Explore regions:", error);
      }
    })();
    void requestLocation();
    return () => {
      active = false;
    };
  }, [requestLocation]);

  useEffect(() => {
    if (location.status === "idle" || location.status === "loading") return;
    if (location.status === "denied" || location.status === "unavailable") {
      setStatus((current) =>
        selectedRegion || current === "ready" ? "ready" : "needs-selection"
      );
      return;
    }
    if (location.status !== "ready") return;
    if (manualSelectionRef.current) return;
    if (regions.length === 0) return;

    const key = `${location.coordinates.latitude}:${location.coordinates.longitude}`;
    if (resolvedCoordinatesRef.current === key) return;
    resolvedCoordinatesRef.current = key;
    const attempt = ++resolutionAttemptRef.current;
    void (async () => {
      try {
        const matched = findRegionForCoordinates(location.coordinates, regions);
        if (
          manualSelectionRef.current ||
          attempt !== resolutionAttemptRef.current
        )
          return;
        if (!matched) {
          setSelectedRegion(null);
          setStatus("unsupported");
          return;
        }
        setSelectedRegion(matched);
        await saveRegion(matched);
        setStatus("ready");
      } catch (error) {
        reportError("Unable to resolve Explore region:", error);
        setStatus(selectedRegion ? "ready" : "needs-selection");
      }
    })();
  }, [location, locationRefresh, regions, selectedRegion]);

  const selectRegion = useCallback(async (region: ExploreRegion) => {
    resolutionAttemptRef.current += 1;
    manualSelectionRef.current = true;
    setSelectedRegion(region);
    setStatus("ready");
    await saveRegion(region);
  }, []);

  const useMyLocation = useCallback(async () => {
    resolutionAttemptRef.current += 1;
    manualSelectionRef.current = false;
    resolvedCoordinatesRef.current = null;
    setStatus("loading");
    setLocationRefresh((current) => current + 1);
    await requestLocation();
  }, [requestLocation]);

  return useMemo(
    () => ({
      state: {
        status,
        regions,
        selectedRegion,
        locationStatus: location.status,
      },
      selectRegion,
      useMyLocation,
    }),
    [
      location.status,
      regions,
      selectRegion,
      selectedRegion,
      status,
      useMyLocation,
    ]
  );
}

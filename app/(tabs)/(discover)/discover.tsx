import React, { useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import ExploreScreen from "@/components/explore/ExploreScreen";
import {
  getFirstExploreParam,
  resolveExploreView,
  type ExploreView,
} from "@/components/explore/exploreView";

type ExploreRouteParams = {
  view?: string | string[];
  tab?: string | string[];
  lat?: string | string[];
  lon?: string | string[];
  locationId?: string | string[];
  screenshotSeed?: string | string[];
};

export default function ExploreRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<ExploreRouteParams>();
  const view = resolveExploreView(params);

  const handleViewChange = useCallback(
    (nextView: ExploreView) => {
      router.setParams({ view: nextView });
    },
    [router]
  );

  return (
    <ExploreScreen
      view={view}
      onViewChange={handleViewChange}
      mapFocus={{
        lat: getFirstExploreParam(params.lat),
        lon: getFirstExploreParam(params.lon),
        locationId: getFirstExploreParam(params.locationId),
        screenshotSeed: getFirstExploreParam(params.screenshotSeed),
      }}
    />
  );
}

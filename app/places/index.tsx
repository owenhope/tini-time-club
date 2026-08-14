import { Redirect, useLocalSearchParams } from "expo-router";
import { getFirstExploreParam } from "@/components/explore/exploreView";
import { routes } from "@/utils/routes";

type LegacyPlacesParams = {
  lat?: string | string[];
  lon?: string | string[];
  locationId?: string | string[];
  screenshotSeed?: string | string[];
};

/** Keeps existing `/places` links working while Explore owns the map. */
export default function LegacyPlacesMapRedirect() {
  const params = useLocalSearchParams<LegacyPlacesParams>();

  return (
    <Redirect
      href={routes.discover({
        view: "map",
        lat: getFirstExploreParam(params.lat),
        lon: getFirstExploreParam(params.lon),
        locationId: getFirstExploreParam(params.locationId),
        screenshotSeed: getFirstExploreParam(params.screenshotSeed),
      })}
    />
  );
}

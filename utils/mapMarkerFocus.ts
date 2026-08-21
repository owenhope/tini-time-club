export interface MarkerFocusRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const PIN_VISIBLE_AREA_ANCHOR = 0.6;
const SELECTED_PIN_MAX_LATITUDE_DELTA = 0.04;

interface GetMarkerFocusRegionParams {
  location: { latitude: number; longitude: number };
  region: MarkerFocusRegion;
  mapHeight: number;
  coveredHeight: number;
}

export const getMarkerFocusRegion = ({
  location,
  region,
  mapHeight,
  coveredHeight,
}: GetMarkerFocusRegionParams): MarkerFocusRegion => {
  const zoomScale = Math.min(
    1,
    SELECTED_PIN_MAX_LATITUDE_DELTA / region.latitudeDelta
  );
  const focusedLatitudeDelta = region.latitudeDelta * zoomScale;
  const focusedLongitudeDelta = region.longitudeDelta * zoomScale;
  const visibleHeight = Math.max(0, mapHeight - coveredHeight);
  const pinY = visibleHeight * PIN_VISIBLE_AREA_ANCHOR;
  const latitudeOffset =
    mapHeight > 0
      ? focusedLatitudeDelta * ((mapHeight / 2 - pinY) / mapHeight)
      : 0;

  return {
    ...region,
    latitude: location.latitude - latitudeOffset,
    longitude: location.longitude,
    latitudeDelta: focusedLatitudeDelta,
    longitudeDelta: focusedLongitudeDelta,
  };
};

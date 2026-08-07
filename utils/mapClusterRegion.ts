import type { Region } from "react-native-maps";

export type ClusterCoordinate = [number, number];

export interface ClusterPressRegionInput {
  childCoordinates?: ClusterCoordinate[];
  clusterCoordinate?: ClusterCoordinate;
  currentRegion: Region;
  fitPadding: number;
  minDelta: number;
  fallbackZoom: number;
}

const getZoomFloor = (
  currentDelta: number,
  fallbackZoom: number,
  minDelta: number
) => Math.min(currentDelta * fallbackZoom, minDelta);

const isCoordinate = (coordinate: unknown): coordinate is ClusterCoordinate =>
  Array.isArray(coordinate) &&
  Number.isFinite(coordinate[0]) &&
  Number.isFinite(coordinate[1]);

export const getClusterPressRegion = ({
  childCoordinates,
  clusterCoordinate,
  currentRegion,
  fitPadding,
  minDelta,
  fallbackZoom,
}: ClusterPressRegionInput): Region | null => {
  const coordinates = (childCoordinates ?? []).filter(isCoordinate);
  const hasClusterCoordinate = isCoordinate(clusterCoordinate);

  if (coordinates.length === 0 && !hasClusterCoordinate) return null;

  if (coordinates.length === 0 && hasClusterCoordinate) {
    return {
      latitude: clusterCoordinate[1],
      longitude: clusterCoordinate[0],
      latitudeDelta: Math.max(
        currentRegion.latitudeDelta * fallbackZoom,
        getZoomFloor(currentRegion.latitudeDelta, fallbackZoom, minDelta)
      ),
      longitudeDelta: Math.max(
        currentRegion.longitudeDelta * fallbackZoom,
        getZoomFloor(currentRegion.longitudeDelta, fallbackZoom, minDelta)
      ),
    };
  }

  const latitudes = coordinates.map(([, latitude]) => latitude);
  const longitudes = coordinates.map(([longitude]) => longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLong = Math.min(...longitudes);
  const maxLong = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLong + maxLong) / 2,
    latitudeDelta: Math.max(
      (maxLat - minLat) * fitPadding,
      getZoomFloor(currentRegion.latitudeDelta, fallbackZoom, minDelta)
    ),
    longitudeDelta: Math.max(
      (maxLong - minLong) * fitPadding,
      getZoomFloor(currentRegion.longitudeDelta, fallbackZoom, minDelta)
    ),
  };
};

import type { Region } from "react-native-maps";

interface MapPoint {
  id: string | number;
  lat: number;
  long: number;
}

const mercatorY = (latitude: number) => {
  const radians = (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
};
const longitudeOffset = (longitude: number, center: number) =>
  ((longitude - center + 540) % 360) - 180;

/** Group touching pin footprints, not venues within a fixed geographic radius.
 * Map rotation and pitch are disabled so the viewport has a 2D projection.
 */
export function groupGoldenGlassPins<T extends MapPoint>(
  locations: T[],
  region: Region,
  viewport: { width: number; height: number },
  selectedId: string | number | null
): T[][] {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return locations.map((location) => [location]);
  }
  const north = mercatorY(region.latitude + region.latitudeDelta / 2);
  const south = mercatorY(region.latitude - region.latitudeDelta / 2);
  const longitudeSpan = Math.abs(region.longitudeDelta) || 360;
  const points = locations.map((location) => {
    const selected = String(location.id) === String(selectedId);
    return {
      x:
        (longitudeOffset(location.long, region.longitude) / longitudeSpan) *
        viewport.width,
      y:
        ((north - mercatorY(location.lat)) / Math.max(north - south, 1e-10)) *
        viewport.height,
      width: selected ? 52 : 38,
      height: selected ? 68 : 51,
    };
  });
  const roots = points.map((_, index) => index);
  const root = (index: number): number => {
    while (roots[index] !== index) index = roots[index];
    return index;
  };
  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = points[i];
      const b = points[j];
      // Pins are anchored at their bottom. Include a small breathing gap.
      if (
        Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 4 &&
        a.y - a.height - 4 < b.y &&
        b.y - b.height - 4 < a.y
      ) {
        roots[root(i)] = root(j);
      }
    }
  }
  const groups = new Map<number, T[]>();
  locations.forEach((location, index) => {
    const key = root(index);
    groups.set(key, [...(groups.get(key) ?? []), location]);
  });
  return [...groups.values()];
}

export function getGoldenGlassGroupRegion(
  locations: MapPoint[],
  currentRegion: Region
): Region {
  const anchor = locations[0];
  const latitudes = locations.map((location) => location.lat);
  const offsets = locations.map((location) =>
    longitudeOffset(location.long, anchor.long)
  );
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: anchor.long + (Math.min(...offsets) + Math.max(...offsets)) / 2,
    // Fit close venues directly rather than requiring repeated taps. Clamp
    // broad chains so tapping a group always moves inward.
    latitudeDelta: Math.min(
      currentRegion.latitudeDelta * 0.4,
      Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 4, 0.0005)
    ),
    longitudeDelta: Math.min(
      currentRegion.longitudeDelta * 0.4,
      Math.max((Math.max(...offsets) - Math.min(...offsets)) * 4, 0.0005)
    ),
  };
}

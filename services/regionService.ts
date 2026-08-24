import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/utils/supabase";

export interface ExploreRegion {
  id: number;
  slug: string;
  name: string;
  displayOrder: number;
  center: { latitude: number; longitude: number };
  catchmentRadiusMeters: number;
}

const SAVED_REGION_KEY = "explore_last_region_v1";
const EARTH_RADIUS_METERS = 6_371_000;

const toRegion = (row: any): ExploreRegion => ({
  id: Number(row.id),
  slug: String(row.slug),
  name: String(row.name),
  displayOrder: Number(row.display_order) || 0,
  center: {
    latitude: Number(row.center_lat),
    longitude: Number(row.center_lon),
  },
  catchmentRadiusMeters: Number(row.catchment_radius_m),
});

export async function getEnabledRegions(): Promise<ExploreRegion[]> {
  const { data, error } = await supabase.rpc("get_enabled_regions");
  if (error) throw error;
  return (data ?? []).map(toRegion);
}

function distanceBetweenCoordinates(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function findRegionForCoordinates(
  coordinates: { latitude: number; longitude: number },
  regions: ExploreRegion[]
): ExploreRegion | null {
  return (
    regions
      .map((region) => ({
        region,
        distance: distanceBetweenCoordinates(coordinates, region.center),
      }))
      .filter(
        ({ region, distance }) =>
          Number.isFinite(region.catchmentRadiusMeters) &&
          distance <= region.catchmentRadiusMeters
      )
      .sort((a, b) => a.distance - b.distance)[0]?.region ?? null
  );
}

export async function getSavedRegionId(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(SAVED_REGION_KEY);
    const id = value ? Number(value) : NaN;
    return Number.isSafeInteger(id) ? id : null;
  } catch {
    return null;
  }
}

export async function saveRegion(region: ExploreRegion): Promise<void> {
  await AsyncStorage.setItem(SAVED_REGION_KEY, String(region.id));
}

export async function clearSavedRegion(): Promise<void> {
  await AsyncStorage.removeItem(SAVED_REGION_KEY);
}

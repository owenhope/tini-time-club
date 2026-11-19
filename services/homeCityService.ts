import * as Location from "expo-location";
import { Platform } from "react-native";
import { GOOGLE_MAPS_API_KEY } from "@/utils/locationUtils";
import { supabase } from "@/utils/supabase";
import { newSessionToken } from "@/services/placesService";
import AnalyticService from "@/services/analyticsService";
import { decodePassportStamp } from "@/services/passportService";
import { requestPassportReconciliation } from "@/utils/passport-reconciliation-events";

import { cityLabel, type HomeCity } from "@/utils/homeCity";
export { cityLabel, type HomeCity } from "@/utils/homeCity";
export interface CitySuggestion {
  id: string;
  label: string;
}
export const createCitySession = newSessionToken;

interface AddressComponent {
  longText: string;
  types: string[];
}
function cityFromComponents(
  components: AddressComponent[],
  placeId: string | null,
  source: HomeCity["source"]
): HomeCity {
  const part = (type: string) =>
    components.find((c) => c.types.includes(type))?.longText ?? "";
  const name =
    part("locality") ||
    part("postal_town") ||
    part("administrative_area_level_3");
  const country = part("country");
  if (!name || !country)
    throw new Error("We couldn't identify a city. Please choose one below.");
  return {
    name,
    region: part("administrative_area_level_1"),
    country,
    place_id: placeId,
    source,
  };
}

export async function searchCities(
  query: string,
  sessionToken: string,
  signal?: AbortSignal
): Promise<CitySuggestion[]> {
  if (query.trim().length < 2) return [];
  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      },
      body: JSON.stringify({
        input: query.trim(),
        includedPrimaryTypes: ["(cities)"],
        sessionToken,
      }),
    }
  );
  if (!response.ok)
    throw new Error("City search is unavailable. Please try again.");
  const data = await response.json();
  return (data.suggestions ?? []).flatMap(
    (s: {
      placePrediction?: { placeId?: string; text?: { text?: string } };
    }) => {
      const p = s.placePrediction;
      return p?.placeId && p.text?.text
        ? [{ id: p.placeId, label: p.text.text }]
        : [];
    }
  );
}

export async function selectCity(
  id: string,
  sessionToken: string
): Promise<HomeCity> {
  const params = new URLSearchParams({ sessionToken });
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?${params}`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "id,addressComponents,types",
      },
    }
  );
  if (!response.ok)
    throw new Error("Couldn't load that city. Please try again.");
  const data = await response.json();
  const city = cityFromComponents(
    data.addressComponents ?? [],
    data.id,
    "manual"
  );
  void AnalyticService.capture("home_city_selected");
  return city;
}

/**
 * Map centre for a saved home city, looked up on demand: profiles store the
 * city only, never coordinates. Returns null when it can't be found.
 */
export async function getHomeCityCoordinates(
  city: HomeCity
): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({ key: GOOGLE_MAPS_API_KEY });
  if (city.place_id) params.set("place_id", city.place_id);
  else params.set("address", cityLabel(city));
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const location = data.results?.[0]?.geometry?.location;
    return typeof location?.lat === "number" &&
      typeof location?.lng === "number"
      ? { lat: location.lat, lon: location.lng }
      : null;
  } catch {
    return null;
  }
}

export class HomeCityPermissionDeniedError extends Error {
  constructor() {
    super(
      "Location access is off. You can still choose your home city manually."
    );
    this.name = "HomeCityPermissionDeniedError";
  }
}

export async function hasHomeCityLocationPermission(): Promise<boolean> {
  return (await Location.getForegroundPermissionsAsync()).granted;
}

export async function detectHomeCity(): Promise<HomeCity> {
  try {
    return await detectCityFromDevice();
  } catch (error) {
    if (error instanceof HomeCityPermissionDeniedError) throw error;
    throw new Error(
      "Couldn't find your location. Search for your city instead."
    );
  }
}

async function detectCityFromDevice(): Promise<HomeCity> {
  const permission = await Location.requestForegroundPermissionsAsync();
  void AnalyticService.capture(
    permission.granted
      ? "home_city_permission_granted"
      : "home_city_permission_denied"
  );
  if (!permission.granted) throw new HomeCityPermissionDeniedError();
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  let city: HomeCity;
  if (Platform.OS === "web") {
    const params = new URLSearchParams({
      latlng: `${position.coords.latitude},${position.coords.longitude}`,
      result_type: "locality|postal_town",
      key: GOOGLE_MAPS_API_KEY,
    });
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    );
    if (!response.ok)
      throw new Error("Couldn't find your city. Please choose one below.");
    const data = await response.json();
    const result = data.results?.[0];
    city = cityFromComponents(
      (result?.address_components ?? []).map(
        (c: { long_name: string; types: string[] }) => ({
          longText: c.long_name,
          types: c.types,
        })
      ),
      result?.place_id ?? null,
      "device"
    );
  } else {
    const [address] = await Location.reverseGeocodeAsync(position.coords);
    if (!address?.city || !address.country)
      throw new Error("Couldn't find your city. Please choose one below.");
    city = {
      name: address.city,
      region: address.region ?? "",
      country: address.country,
      place_id: null,
      source: "device",
    };
  }
  void AnalyticService.capture("home_city_detected");
  return city;
}

export async function saveHomeCity(
  city: HomeCity | null,
  origin: "onboarding" | "profile"
) {
  const { data, error } = await supabase.rpc("set_my_home_city_v1", {
    p_city: city,
  });
  if (error) throw new Error("Couldn't save your home city. Please try again.");
  void AnalyticService.capture(
    city
      ? origin === "onboarding"
        ? "home_city_onboarding_saved"
        : "home_city_profile_saved"
      : "home_city_removed"
  );
  requestPassportReconciliation();
  return Array.isArray(data?.unlocked)
    ? data.unlocked.map(decodePassportStamp)
    : [];
}

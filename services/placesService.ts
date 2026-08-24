import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import {
  GOOGLE_MAPS_API_KEY,
  NEARBY_BROWSE_TYPES,
} from "@/utils/locationUtils";
import { reportError } from "@/utils/log";
import { normalizeVenueName } from "@/utils/venueName";

/**
 * Places API (New) client. Replaces the deprecated legacy Places endpoints:
 *  - one searchNearby call with an includedTypes array (the legacy API
 *    needed one billed request per type),
 *  - autocomplete with session tokens for search-as-you-type (billed per
 *    session instead of per keystroke), terminated by a place-details call
 *    when the user picks a result.
 *
 * Results are mapped to the legacy result shape ({ place_id, name,
 * geometry.location, types, ... }) so existing rendering, filtering, and
 * ranking code keeps working unchanged.
 */

const PLACES_BASE = "https://places.googleapis.com/v1";
const venueDetailsCache = new Map<string, PlaceResult>();

/** Legacy-shaped place used across the app's location UIs. */
export interface PlaceResult {
  place_id: string;
  /** Normalised for display and storage — the API shouts, we don't. */
  name: string;
  /** Exactly what the API returned, kept for search matching. */
  raw_name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: {
    location: { lat: number; lng: number };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  types: string[];
  /** Metres from the search origin; only autocomplete provides this. */
  distance_meters?: number;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

const postJson = async (path: string, body: unknown, fieldMask?: string) => {
  const response = await fetch(`${PLACES_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message ?? "Places API error");
  return data;
};

const mapNewPlace = (place: any): PlaceResult => ({
  place_id: place.id,
  name: normalizeVenueName(place.displayName?.text),
  raw_name: place.displayName?.text ?? "",
  formatted_address: place.formattedAddress,
  types: place.types ?? [],
  geometry: place.location
    ? {
        location: {
          lat: place.location.latitude,
          lng: place.location.longitude,
        },
        viewport: place.viewport
          ? {
              northeast: {
                lat: place.viewport.high.latitude,
                lng: place.viewport.high.longitude,
              },
              southwest: {
                lat: place.viewport.low.latitude,
                lng: place.viewport.low.longitude,
              },
            }
          : undefined,
      }
    : undefined,
});

/** Distance-ranked venues around the user, in one request. */
export const searchNearbyVenues = async (
  center: LatLng,
  radiusMeters = 10000
): Promise<PlaceResult[]> => {
  try {
    const data = await postJson(
      "/places:searchNearby",
      {
        includedTypes: [...NEARBY_BROWSE_TYPES],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: { center, radius: radiusMeters },
        },
      },
      "places.id,places.displayName,places.formattedAddress,places.location,places.types"
    );
    return (data.places ?? []).map(mapNewPlace);
  } catch (error) {
    reportError("Error fetching nearby venues:", error);
    return [];
  }
};

/** A fresh billing session token for one type-ahead interaction. */
export const newSessionToken = (): string => uuidv4();

/**
 * Search-as-you-type predictions. Coordinates are not included — resolve
 * the selected prediction with fetchVenue(placeId, sessionToken), which
 * also terminates the billing session.
 */
export const autocompleteVenues = async (
  query: string,
  sessionToken: string,
  origin?: LatLng | null
): Promise<PlaceResult[]> => {
  try {
    const data = await postJson("/places:autocomplete", {
      input: query,
      sessionToken,
      ...(origin
        ? {
            origin,
            locationBias: {
              circle: { center: origin, radius: 10000 },
            },
          }
        : {}),
    });

    return (data.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any): PlaceResult => ({
        place_id: p.placeId,
        name: normalizeVenueName(
          p.structuredFormat?.mainText?.text ?? p.text?.text
        ),
        raw_name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        formatted_address: p.structuredFormat?.secondaryText?.text,
        types: p.types ?? [],
        distance_meters: p.distanceMeters,
      }));
  } catch (error) {
    reportError("Error autocompleting venues:", error);
    return [];
  }
};

/** City-only autocomplete used by the Admin-independent region selector. */
export const autocompleteCities = async (
  query: string,
  sessionToken: string
): Promise<PlaceResult[]> => {
  if (query.trim().length < 2) return [];
  try {
    const data = await postJson("/places:autocomplete", {
      input: query,
      sessionToken,
      includedPrimaryTypes: ["(cities)"],
    });
    return (data.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any): PlaceResult => ({
        place_id: p.placeId,
        name: normalizeVenueName(
          p.structuredFormat?.mainText?.text ?? p.text?.text
        ),
        raw_name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        formatted_address: p.structuredFormat?.secondaryText?.text,
        types: p.types ?? [],
      }));
  } catch (error) {
    reportError("Error autocompleting cities:", error);
    return [];
  }
};

export interface VenueContact {
  phoneNumber?: string;
  internationalPhoneNumber?: string;
  website?: string;
}

/**
 * Contact details (phone/website) for a venue known only by name and
 * address — one searchText request, replacing the legacy two-step
 * find-place-id-then-details flow the place-info screen used.
 */
export const fetchVenueContact = async (
  name: string,
  address?: string | null
): Promise<VenueContact | null> => {
  try {
    const data = await postJson(
      "/places:searchText",
      {
        textQuery: address ? `${name} ${address}` : name,
        maxResultCount: 1,
      },
      "places.id,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri"
    );
    const place = data.places?.[0];
    if (!place) return null;
    return {
      phoneNumber: place.nationalPhoneNumber,
      internationalPhoneNumber: place.internationalPhoneNumber,
      website: place.websiteUri,
    };
  } catch (error) {
    reportError("Error fetching venue contact:", error);
    return null;
  }
};

/**
 * Resolve a place to coordinates (and viewport). Passing the autocomplete
 * session token here closes that session for billing.
 */
export const fetchVenue = async (
  placeId: string,
  sessionToken?: string
): Promise<PlaceResult | null> => {
  const cached = venueDetailsCache.get(placeId);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      fields: "id,displayName,formattedAddress,location,viewport,types",
      key: GOOGLE_MAPS_API_KEY,
      ...(sessionToken ? { sessionToken } : {}),
    });
    const response = await fetch(
      `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?${params}`
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error.message ?? "Places API error");
    const venue = mapNewPlace(data);
    venueDetailsCache.set(placeId, venue);
    return venue;
  } catch (error) {
    reportError("Error fetching venue details:", error);
    return null;
  }
};

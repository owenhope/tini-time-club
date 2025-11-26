// Google Maps API configuration
export const GOOGLE_MAPS_API_KEY = "AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8";

// Place types that serve alcohol
export const RELEVANT_PLACE_TYPES = [
  "bar",
  "restaurant",
  "night_club",
  "cafe",
  "lounge",
  "hotel",
  "brewery",
  "meal_takeaway",
] as const;

// Calculate distance between two coordinates using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Format distance for display
export const formatDistance = (distance: number): string => {
  return distance < 1
    ? `${Math.round(distance * 1000)}m`
    : `${distance.toFixed(1)}km`;
};

// Calculate name match score for search ranking
export const getNameMatchScore = (name: string, query: string): number => {
  const nameLower = name.toLowerCase();
  const queryLower = query.toLowerCase().trim();

  if (nameLower === queryLower) return 1000;
  if (nameLower.startsWith(queryLower)) return 500;
  if (nameLower.includes(queryLower)) return 100;

  const queryWords = queryLower.split(/\s+/);
  const nameWords = nameLower.split(/\s+/);
  const matches = queryWords.filter((qw) =>
    nameWords.some((nw) => nw.startsWith(qw) || nw.includes(qw))
  );
  return matches.length > 0 ? 50 * (matches.length / queryWords.length) : 0;
};

// Filter places to only include relevant types
export const filterRelevantPlaces = (places: any[]): any[] => {
  return places.filter((place: any) =>
    (place.types || []).some((type: string) =>
      RELEVANT_PLACE_TYPES.includes(type as any)
    )
  );
};

// Deduplicate places by place_id
export const deduplicatePlaces = (places: any[]): any[] => {
  return Array.from(
    new Map(places.map((p: any) => [p.place_id, p])).values()
  );
};

/**
 * Find place_id by searching Google Places API with name and address
 */
export const findPlaceId = async (
  name: string,
  address?: string
): Promise<string | null> => {
  try {
    const query = address ? `${name} ${address}` : name;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      // Return the first result's place_id
      return data.results[0].place_id;
    }

    return null;
  } catch (error) {
    console.error("Error finding place_id:", error);
    return null;
  }
};

/**
 * Fetch Place Details from Google Places API
 * Returns phone number, website, and other details for a given place_id
 */
export const fetchPlaceDetails = async (
  placeId: string
): Promise<{
  phoneNumber?: string;
  website?: string;
  internationalPhoneNumber?: string;
  openingHours?: any;
  priceLevel?: number;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
} | null> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number,website,opening_hours,price_level,rating,user_ratings_total,types&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.result) {
      return {
        phoneNumber: data.result.formatted_phone_number,
        internationalPhoneNumber: data.result.international_phone_number,
        website: data.result.website,
        openingHours: data.result.opening_hours,
        priceLevel: data.result.price_level,
        rating: data.result.rating,
        userRatingsTotal: data.result.user_ratings_total,
        types: data.result.types,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
};

/**
 * Get place details by name and address (finds place_id first, then fetches details)
 */
export const getPlaceDetailsByNameAndAddress = async (
  name: string,
  address?: string
): Promise<{
  phoneNumber?: string;
  website?: string;
  internationalPhoneNumber?: string;
  openingHours?: any;
  priceLevel?: number;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
} | null> => {
  const placeId = await findPlaceId(name, address);
  if (!placeId) return null;
  
  return fetchPlaceDetails(placeId);
};

// Filter and format place types for display
export const getRelevantPlaceTypes = (types: string[] | undefined): string[] => {
  if (!types) return [];
  
  // Filter out generic types and keep relevant ones
  const excludedTypes = [
    "point_of_interest",
    "establishment",
    "food",
    "store",
    "premise",
    "geocode",
    "meal_delivery",
    "meal_takeaway",
  ];
  
  const relevantTypes = types
    .filter((type) => !excludedTypes.includes(type))
    .map((type) => {
      // Format type names: "night_club" -> "Night Club"
      return type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    })
    .slice(0, 5); // Limit to 5 types
  
  return relevantTypes;
};


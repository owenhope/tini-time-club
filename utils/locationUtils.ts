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


import { count, dayCounts, nullableNumber, record } from "./model.mjs";

const indexCounts = (value) => {
  const row = record(value);
  return {
    views: count(row.views),
    filters: count(row.filters),
    generations: count(row.generations),
  };
};

const popularity = (value) => {
  const rows = (Array.isArray(value) ? value : []).map((entry) => {
    const row = record(entry);
    return {
      id: count(row.id),
      name: String(row.name ?? "Unknown"),
      reviewCount: count(row.reviewCount),
      share: 0,
    };
  });
  const total = rows.reduce((sum, row) => sum + row.reviewCount, 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? row.reviewCount / total : 0,
  }));
};

export const resolveContent = (value) => {
  const row = record(value);
  return {
    totalPlaces: count(row.totalPlaces),
    placesInRange: count(row.placesInRange),
    previousPlaces: count(row.previousPlaces),
    reviewedPlacesInRange: count(row.reviewedPlacesInRange),
    reviewsInRange: count(row.reviewsInRange),
    martiniIndex: indexCounts(row.martiniIndex),
    previousMartiniIndex: indexCounts(row.previousMartiniIndex),
    placesByDay: dayCounts(row.placesByDay),
    typePopularity: popularity(row.typePopularity),
    spiritPopularity: popularity(row.spiritPopularity),
    topPlaces: (Array.isArray(row.topPlaces) ? row.topPlaces : []).map(
      (value) => {
        const place = record(value);
        return {
          id: count(place.id),
          name: place.name == null ? null : String(place.name),
          address: place.address == null ? null : String(place.address),
          rating: nullableNumber(place.rating),
          totalRatings: count(place.totalRatings),
          reviewsInRange: count(place.reviewsInRange),
        };
      }
    ),
  };
};

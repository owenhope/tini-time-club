export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLong: number;
  maxLong: number;
}

// locations_in_view builds a PostGIS geography envelope, whose edges run the
// short way around the globe: an edge 180° or longer errors ("Antipodal
// edge") or flips to the other side of the world, and an edge on a pole is
// degenerate. The map never draws past ~85° (Web Mercator), so nothing real
// is lost by clamping there.
export const MAX_QUERY_LATITUDE = 85;
const MAX_SLICE_LONGITUDE = 90;

const normalizeLongitude = (longitude: number) =>
  ((((longitude + 180) % 360) + 360) % 360) - 180;

/** Longitude ranges inside [-180, 180], split where the view crosses 180°. */
const longitudeRanges = (minLong: number, maxLong: number) => {
  if (maxLong - minLong >= 360) return [[-180, 180]];
  if (minLong >= -180 && maxLong <= 180) return [[minLong, maxLong]];
  const start = normalizeLongitude(minLong);
  const end = start + (maxLong - minLong);
  return end <= 180
    ? [[start, end]]
    : [
        [start, 180],
        [-180, end - 360],
      ];
};

/**
 * The viewport as one or more bounds locations_in_view can answer: latitude
 * clamped off the poles, longitude wrapped into range and cut into slices
 * narrower than 180°. A city-sized view comes back unchanged as one slice.
 */
export const toQueryBounds = (bounds: MapBounds): MapBounds[] => {
  const minLat = Math.max(bounds.minLat, -MAX_QUERY_LATITUDE);
  const maxLat = Math.min(bounds.maxLat, MAX_QUERY_LATITUDE);

  return longitudeRanges(bounds.minLong, bounds.maxLong).flatMap(
    ([from, to]) => {
      const count = Math.max(1, Math.ceil((to - from) / MAX_SLICE_LONGITUDE));
      const width = (to - from) / count;
      return Array.from({ length: count }, (_, index) => ({
        minLat,
        maxLat,
        minLong: from + width * index,
        maxLong: index === count - 1 ? to : from + width * (index + 1),
      }));
    }
  );
};

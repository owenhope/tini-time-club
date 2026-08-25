export interface MapLocationLike {
  id: number | string;
  lat?: number | string | null;
  long?: number | string | null;
}

export type NormalizedMapLocation<T extends MapLocationLike> = Omit<
  T,
  "lat" | "long"
> & {
  lat: number;
  long: number;
};

const toFiniteNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const normalizeMapLocations = <T extends MapLocationLike>(
  locations: T[]
): NormalizedMapLocation<T>[] =>
  locations.flatMap((location) => {
    const lat = toFiniteNumber(location.lat);
    const long = toFiniteNumber(location.long);
    return lat === null || long === null
      ? []
      : [{ ...location, lat, long } as NormalizedMapLocation<T>];
  });

/** Keep already-loaded pins visible while a new viewport response is settling. */
export const mergeMapLocations = <T extends MapLocationLike>(
  existing: T[],
  incoming: T[]
): T[] => {
  const byId = new Map<string, T>();
  for (const location of existing) byId.set(String(location.id), location);
  for (const location of incoming) byId.set(String(location.id), location);
  return [...byId.values()];
};

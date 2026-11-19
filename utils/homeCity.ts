export interface HomeCity {
  name: string;
  region: string;
  country: string;
  place_id: string | null;
  source: "manual" | "device";
}
export const cityLabel = (city: HomeCity) =>
  [city.name, city.region, city.country].filter(Boolean).join(", ");

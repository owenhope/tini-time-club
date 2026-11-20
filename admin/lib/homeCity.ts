import type { AdminProfile } from "@/lib/profileTypes";

/** "Vancouver, BC, Canada", or null when the member hasn't added a city. */
export function formatHomeCity(
  homeCity: AdminProfile["home_city"]
): string | null {
  if (!homeCity) return null;
  const label = [homeCity.name, homeCity.region, homeCity.country]
    .filter(Boolean)
    .join(", ");
  return label || null;
}

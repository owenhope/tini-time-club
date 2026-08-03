interface StripNameFromAddressParams {
  name: string;
  address: string;
}

interface StripNameFromAddressFunction {
  (name: string, address: string): string;
}

export const stripNameFromAddress: StripNameFromAddressFunction = (
  name,
  address
) => {
  if (!name || !address) return address;

  const normalizedName = name.trim().toLowerCase();
  const normalizedAddress = address.trim();

  const regex = new RegExp(`^${normalizedName}[,\\s]*`, "i"); // Remove name + optional comma/space at start
  return normalizedAddress.replace(regex, "").trim();
};

export const formatRelativeDate = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
};

/**
 * Reduce a full address to "City, Region" for compact display.
 *
 * Google returns addresses as comma-separated parts, with the country last and
 * the region sometimes carrying a postal code:
 *   "855 Main St, West Vancouver, BC V7T 0A5, Canada" -> "West Vancouver, BC"
 *   "201 Concourse Blvd, Dresher, PA 19025, United States" -> "Dresher, PA"
 *
 * The country is identified by elimination rather than by a country list: a
 * trailing part that isn't a 2-3 letter region code is treated as the country
 * and dropped.
 */
const stripPostalCode = (part: string): string =>
  part
    // Canadian: "BC V7T 0A5"
    .replace(/\s+[A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d\s*$/, "")
    // US and numeric postal codes: "PA 19025", "Bangkok 10120"
    .replace(/\s+\d{4,6}(-\d{4})?\s*$/, "")
    .trim();

// Country abbreviations that would otherwise pass the region-code test.
const COUNTRY_ABBREVIATIONS = new Set(["USA", "UK", "UAE", "CAN", "AUS"]);

const isRegionCode = (part: string): boolean =>
  /^[A-Z]{2,3}$/.test(part) && !COUNTRY_ABBREVIATIONS.has(part);

/**
 * "City, Country" from a Places-style address.
 *
 * A venue is placed by the city it's in and the country that city is in —
 * "North Vancouver, Canada" reads to everyone, where a bare region code only
 * reads to locals. The region is dropped, not shown alongside, so the line
 * stays short enough for a chip.
 */
export const formatCityRegion = (address?: string | null): string => {
  if (!address) return "";

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];

  const last = stripPostalCode(parts[parts.length - 1]);
  // A trailing region code means the country was never in the string — and a
  // two-part address is a street and a city, never a city and a country.
  const hasCountry = !isRegionCode(last) && parts.length >= 3;
  const country = hasCountry ? last : "";

  // Walk back past the country and any region code to the city.
  const beforeCountry = hasCountry ? parts.slice(0, -1) : parts;
  const tail = beforeCountry[beforeCountry.length - 1]
    ? stripPostalCode(beforeCountry[beforeCountry.length - 1])
    : "";
  const city =
    isRegionCode(tail) && beforeCountry.length >= 2
      ? beforeCountry[beforeCountry.length - 2]
      : tail;

  // Two-part addresses are ambiguous: "Vancouver, BC" is city+region, but
  // "401 Main Street, Columbia" is street+city.
  if (!country) {
    return isRegionCode(last) && parts.length >= 2
      ? [parts[parts.length - 2], last].filter(Boolean).join(", ")
      : last;
  }

  return [city, country].filter(Boolean).join(", ");
};

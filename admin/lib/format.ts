/**
 * Address/date formatting vendored from the app's utils/helpers.ts so the
 * public share page renders addresses exactly like the mobile ReviewItem.
 * Vercel uploads only admin/, so admin cannot import files outside it. Keep
 * this implementation aligned with the app; helpers.test.ts enforces parity.
 */

export const stripNameFromAddress = (
  name: string | null | undefined,
  address: string | null | undefined
): string => {
  if (!name || !address) return address ?? "";

  const normalizedName = name.trim().toLowerCase();
  const normalizedAddress = address.trim();

  const regex = new RegExp(`^${normalizedName}[,\\s]*`, "i");
  return normalizedAddress.replace(regex, "").trim();
};

const stripPostalCode = (part: string): string =>
  part
    // Canadian: "BC V7T 0A5"
    .replace(/\s+[A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d\s*$/, "")
    // US and numeric postal codes: "PA 19025", "Bangkok 10120"
    .replace(/\s+\d{4,6}(-\d{4})?\s*$/, "")
    .trim();

const STREET_PATTERN =
  /\b(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|pl|place|ln|lane|mews|concourse|soi|cad|caddesi|sokak|sk\.?|mahallesi)\b/i;

const hasLetter = (part: string): boolean => /[^\W\d_]/u.test(part);

const cityPairFromSlashPart = (part: string): string | null => {
  const slashParts = part
    .split("/")
    .map((item) => stripPostalCode(item.trim()))
    .filter(Boolean);

  if (slashParts.length < 2) return null;

  const cityPair = slashParts
    .slice(-2)
    .map((item) => item.replace(/^\d{4,6}\s+/, "").trim())
    .filter(Boolean);

  if (
    cityPair.length === 2 &&
    cityPair.every(hasLetter) &&
    cityPair.every((item) => !STREET_PATTERN.test(item))
  ) {
    return cityPair.join(", ");
  }

  return null;
};

const cityFromSlashPart = (part: string): string | null => {
  const cityPair = cityPairFromSlashPart(part);
  if (!cityPair) return null;

  const pairParts = cityPair.split(",").map((item) => item.trim());
  return pairParts[pairParts.length - 1] ?? null;
};

const COUNTRY_ABBREVIATIONS = new Set(["USA", "UK", "UAE", "CAN", "AUS"]);

const isRegionCode = (part: string): boolean =>
  /^[A-Z]{2,3}$/.test(part) && !COUNTRY_ABBREVIATIONS.has(part);

export const formatCityRegion = (address?: string | null): string => {
  if (!address) return "";

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];

  const last = stripPostalCode(parts[parts.length - 1]);
  const hasCountry =
    !isRegionCode(last) && !STREET_PATTERN.test(last) && parts.length >= 3;
  const country = hasCountry ? last : "";

  const beforeCountry = hasCountry ? parts.slice(0, -1) : parts;
  const tail = beforeCountry[beforeCountry.length - 1]
    ? stripPostalCode(beforeCountry[beforeCountry.length - 1])
    : "";
  const rawCity =
    isRegionCode(tail) && beforeCountry.length >= 2
      ? beforeCountry[beforeCountry.length - 2]
      : tail;
  const city = cityFromSlashPart(rawCity) ?? rawCity;

  if (!country) {
    const slashCityPair = parts.map(cityPairFromSlashPart).find(Boolean);
    if (slashCityPair) return slashCityPair;

    if (parts.length >= 2 && STREET_PATTERN.test(parts[0])) {
      return stripPostalCode(parts[1]);
    }

    return isRegionCode(last) && parts.length >= 2
      ? [parts[parts.length - 2], last].filter(Boolean).join(", ")
      : last;
  }

  return [city, country].filter(Boolean).join(", ");
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

export const formatRating = (rating?: number | null): string =>
  rating == null ? "—" : Number(rating).toFixed(1);

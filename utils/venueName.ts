/**
 * Venue names arrive from the Places API shouting: "COPPER CHIMNEY INDIAN
 * RESTAURANT". Normalising once here, at the service boundary, beats
 * fighting it on every screen that renders a name — and it is the normalised
 * string that gets stored, with the raw one kept alongside for search
 * matching.
 */

/** Joiners that stay lowercase inside a name, but never lead it. */
const JOINERS = new Set(["and", "at", "by", "of", "on", "the"]);

/** Above this share of upper-case letters the name is treated as shouting. */
const SHOUTING = 0.8;

const isShouting = (name: string): boolean => {
  const letters = name.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return false;
  const upper = letters.replace(/[^\p{Lu}]/gu, "");
  return upper.length / letters.length > SHOUTING;
};

/**
 * A token short enough — or numeric enough — to be a mark rather than a
 * shout: SF, BC, ONE65. A name made only of these is left exactly as it
 * arrived, which is what keeps "ONE65 SF" from becoming "One65 Sf".
 */
const isMarkToken = (token: string): boolean => {
  const letters = token.replace(/[^\p{L}]/gu, "");
  if (!letters) return true;
  if (/\d/.test(token)) return true;
  return letters.length <= 3 && letters === letters.toUpperCase();
};

const titleCaseToken = (token: string): string =>
  token
    .toLowerCase()
    // Start of the token, and after a hyphen or bracket: Jean-Luc, not
    // Jean-luc.
    .replace(
      /(^|[-–—/([])(\p{L})/gu,
      (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`
    )
    // After an apostrophe only when a word follows it, so O'Brien capitalises
    // but the possessive in O'Brien's doesn't.
    .replace(
      /'(\p{L})(\p{L})/gu,
      (_, first, second) => `'${first.toUpperCase()}${second}`
    );

/**
 * Title-case a shouted venue name, leaving anything already mixed-case alone.
 * Digits and all-short-token names survive as typed; joiners drop to
 * lowercase unless they lead the name.
 */
export const normalizeVenueName = (name?: string | null): string => {
  if (!name) return "";
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!isShouting(trimmed)) return trimmed;

  const tokens = trimmed.split(" ");
  if (tokens.every(isMarkToken)) return trimmed;

  return tokens
    .map((token, index) => {
      // A token carrying a digit is a mark wherever it appears.
      if (/\d/.test(token)) return token;
      const cased = titleCaseToken(token);
      if (index > 0 && JOINERS.has(cased.toLowerCase())) {
        return cased.toLowerCase();
      }
      return cased;
    })
    .join(" ");
};

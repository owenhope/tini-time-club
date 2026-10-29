/**
 * What this session already knows about the member's liked places, so a
 * place screen can open in the right colour instead of flashing from purple to
 * pink while it asks the server. The server stays the source of truth: every
 * read and write still goes through, and lands here when it does.
 */

// A whole favorites list, read in one go; any place not in it is not liked.
const lists = new Map<string, Set<string>>();
// Single answers newer than the list: a place read or toggled since.
const answers = new Map<string, boolean>();

const answerKey = (memberId: string, locationId: string | number) =>
  `${memberId}:${String(locationId)}`;

export function rememberFavorite(
  memberId: string,
  locationId: string | number,
  saved: boolean
) {
  answers.set(answerKey(memberId, locationId), saved);
}

export function rememberFavoriteList(
  memberId: string,
  locationIds: Iterable<string | number>
) {
  lists.set(memberId, new Set([...locationIds].map(String)));
  // The fresh list supersedes the member's older single answers.
  for (const key of answers.keys()) {
    if (key.startsWith(`${memberId}:`)) answers.delete(key);
  }
}

/** True or false when known this session; null when it has to be asked. */
export function knownFavorite(
  memberId: string,
  locationId: string | number
): boolean | null {
  const answer = answers.get(answerKey(memberId, locationId));
  if (answer != null) return answer;
  const list = lists.get(memberId);
  return list ? list.has(String(locationId)) : null;
}

export function clearFavoritePlacesCache() {
  lists.clear();
  answers.clear();
}

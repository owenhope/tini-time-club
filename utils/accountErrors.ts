/**
 * PostgREST returns PGRST116 ("JSON object requested, multiple (or no) rows
 * returned") whenever .single() matches zero rows. On a profile read or write
 * keyed by auth.uid(), zero rows means the signed-in user has no profile row —
 * the account was deleted, on this device or another one, while the session
 * on this device is still valid.
 *
 * Without this the user sees a raw Postgres error ("Failed to update profile")
 * and every subsequent write fails the same way, with no path out.
 */
const NO_ROWS = "PGRST116";

export const ACCOUNT_GONE_MESSAGE =
  "This account is no longer available. Please sign in again.";

export const isAccountGoneError = (error: any): boolean => {
  if (!error) return false;
  if (error.code === NO_ROWS) return true;
  // authCache.fetchProfile rethrows as `Profile fetch error: <code>`
  return typeof error.message === "string" && error.message.includes(NO_ROWS);
};

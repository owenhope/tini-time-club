import { Filter } from "bad-words";

const usernameFilter = new Filter();

/** Months a member must wait between renames; the database enforces the same. */
export const USERNAME_CHANGE_MONTHS = 3;

/** Client-side username rules shared by onboarding and Edit Profile. */
export function getUsernameError(username: string): string | null {
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 20) return "Username must be 20 characters or less";
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Use only letters, numbers, and underscores";
  }
  if (usernameFilter.isProfane(username)) {
    return "Please choose a different username";
  }
  return null;
}

/**
 * The earliest moment a member may rename again, or null when they can now.
 * Mirrors Postgres' `timestamptz + interval '3 months'` (calendar months,
 * clamped to the end of a shorter month).
 */
export function nextUsernameChangeAt(
  changedAt: string | null | undefined,
  now: Date = new Date()
): Date | null {
  if (!changedAt) return null;
  const last = new Date(changedAt);
  if (Number.isNaN(last.getTime())) return null;

  const next = new Date(last);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + USERNAME_CHANGE_MONTHS);
  const lastDayOfMonth = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDayOfMonth));

  return next.getTime() > now.getTime() ? next : null;
}

export function formatUsernameChangeDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

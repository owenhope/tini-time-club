/**
 * App Store and Google Play reviewers can't open a magic link or pass a
 * Google security check on a fresh device, so this one account signs in with
 * a password instead. Every other address keeps the magic-link flow.
 */
export const REVIEWER_EMAIL = "review@tinitimeclub.com";

export const isReviewerEmail = (email: string) =>
  email.trim().toLowerCase() === REVIEWER_EMAIL;

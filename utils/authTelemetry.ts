import AsyncStorage from "@react-native-async-storage/async-storage";
import AnalyticService from "@/services/analyticsService";
import { reportError } from "./log";

/**
 * Telemetry for sign-outs the member did not ask for.
 *
 * Production users were losing their session to storage bugs (see
 * ./sessionStorage.ts) and the only signal was an App Store review. Two
 * Sentry events now cover both ways a session can vanish:
 *
 * - "Unexpected sign-out": SIGNED_OUT fired while the app was running and no
 *   screen had marked an intentional sign-out just before it.
 * - "Session missing at launch": the previous run was signed in (persisted
 *   marker) but this launch resolved to no session — the session was lost
 *   while the app was closed or backgrounded.
 *
 * Everything reported is token-safe: static messages plus a reason label,
 * never session contents.
 */

const LAST_SIGNED_IN_KEY = "auth_last_signed_in";

// Long enough to cover a slow sign-out network request between the screen's
// mark and the SIGNED_OUT event; short enough that a stale mark from a failed
// attempt doesn't swallow a real unexpected sign-out later.
const EXPECTED_SIGN_OUT_WINDOW_MS = 60_000;

let expectedSignOut: { reason: string; at: number } | null = null;

/**
 * Call right before an intentional supabase.auth.signOut() so the resulting
 * SIGNED_OUT event is not reported as unexpected.
 */
export const markExpectedSignOut = (reason: string): void => {
  expectedSignOut = { reason, at: Date.now() };
};

const clearExpectedSignOut = (reason: string): void => {
  if (expectedSignOut?.reason === reason) expectedSignOut = null;
};

/**
 * Mark and run an intentional sign-out as one operation. A failed request
 * clears its mark so it cannot suppress a later, genuinely unexpected event.
 */
export const runExpectedSignOut = async <T extends { error?: unknown }>(
  reason: string,
  signOut: () => Promise<T>
): Promise<T> => {
  markExpectedSignOut(reason);
  try {
    const result = await signOut();
    if (result.error) clearExpectedSignOut(reason);
    return result;
  } catch (error) {
    clearExpectedSignOut(reason);
    throw error;
  }
};

const consumeExpectedSignOut = (): string | null => {
  const mark = expectedSignOut;
  expectedSignOut = null;
  if (!mark) return null;
  return Date.now() - mark.at < EXPECTED_SIGN_OUT_WINDOW_MS
    ? mark.reason
    : null;
};

/** Record that this install has a signed-in member (survives restarts). */
export const recordSignedIn = async (): Promise<void> => {
  await AsyncStorage.setItem(LAST_SIGNED_IN_KEY, "1").catch(() => {});
};

/**
 * Handle a SIGNED_OUT auth event: clear the signed-in marker and report to
 * Sentry when no screen marked this sign-out as intentional.
 */
export const trackSignedOut = async (): Promise<void> => {
  const reason = consumeExpectedSignOut();
  await AsyncStorage.removeItem(LAST_SIGNED_IN_KEY).catch(() => {});
  if (!reason) {
    void AnalyticService.capture("auth_unexpected_sign_out");
    reportError(
      "[Auth] Unexpected sign-out: the session ended without the member asking to sign out."
    );
  }
};

/**
 * Call once at startup with the resolved initial session state. Reports when
 * the previous run was signed in but the persisted session is now gone.
 */
export const trackInitialSession = async (
  hasSession: boolean
): Promise<void> => {
  if (hasSession) {
    await recordSignedIn();
    return;
  }
  try {
    const wasSignedIn = await AsyncStorage.getItem(LAST_SIGNED_IN_KEY);
    if (!wasSignedIn) return;
    await AsyncStorage.removeItem(LAST_SIGNED_IN_KEY);
    void AnalyticService.capture("auth_session_missing_at_launch");
    reportError(
      "[Auth] Session missing at launch: the member was signed in last run but must now log in again."
    );
  } catch {
    // Telemetry must never affect startup.
  }
};

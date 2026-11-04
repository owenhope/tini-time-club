import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { reportError } from "@/utils/log";

/**
 * Asks members for an App Store / Google Play rating with the system prompt,
 * at moments they are likely to be happy with the app:
 *
 * - posters: right after their second (or later) posted review;
 * - readers: right after a favorite, like or follow, once they have opened the
 *   app on several separate days.
 *
 * The OS decides whether the prompt actually appears (iOS shows it at most
 * three times a year) and never reports the outcome. On top of that we ask at
 * most once per app version and leave a long gap between asks. Callers are
 * member-only actions, so guests are never asked.
 *
 * There is deliberately no "Enjoying the app?" pre-question: routing only happy
 * users to the store is review gating, which Google Play prohibits.
 */

const STORAGE_KEY = "rating-prompt:v1";

export const MIN_POSTED_REVIEWS = 2;
export const MIN_OPEN_DAYS = 4;
export const PROMPT_COOLDOWN_MS = 120 * 24 * 60 * 60 * 1000;
/** Lets the destination screen settle before the system sheet slides in. */
const PROMPT_DELAY_MS = 1500;

export type RatingPromptState = {
  /** Distinct local calendar days the app has been opened on. */
  openDayCount: number;
  /** The last counted day, as YYYY-MM-DD in local time. */
  lastOpenDay: string | null;
  lastPromptAt: string | null;
  lastPromptVersion: string | null;
};

export type RatingPromptTrigger =
  { kind: "posted-review"; postedReviewCount: number } | { kind: "engagement" };

const EMPTY_STATE: RatingPromptState = {
  openDayCount: 0,
  lastOpenDay: null,
  lastPromptAt: null,
  lastPromptVersion: null,
};

const localDay = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const appVersion = () => Constants.expoConfig?.version ?? null;

export const isEligibleForRatingPrompt = (
  state: RatingPromptState,
  trigger: RatingPromptTrigger,
  version: string | null,
  now: Date
): boolean => {
  const qualifies =
    trigger.kind === "posted-review"
      ? trigger.postedReviewCount >= MIN_POSTED_REVIEWS
      : state.openDayCount >= MIN_OPEN_DAYS;
  if (!qualifies) return false;

  if (version && state.lastPromptVersion === version) return false;
  if (state.lastPromptAt) {
    const last = Date.parse(state.lastPromptAt);
    if (Number.isFinite(last) && now.getTime() - last < PROMPT_COOLDOWN_MS) {
      return false;
    }
  }
  return true;
};

export const countOpenDay = (
  state: RatingPromptState,
  now: Date
): RatingPromptState => {
  const today = localDay(now);
  if (state.lastOpenDay === today) return state;
  return {
    ...state,
    openDayCount: state.openDayCount + 1,
    lastOpenDay: today,
  };
};

const readState = async (): Promise<RatingPromptState> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<RatingPromptState>;
    return {
      openDayCount:
        typeof parsed.openDayCount === "number" && parsed.openDayCount >= 0
          ? parsed.openDayCount
          : 0,
      lastOpenDay:
        typeof parsed.lastOpenDay === "string" ? parsed.lastOpenDay : null,
      lastPromptAt:
        typeof parsed.lastPromptAt === "string" ? parsed.lastPromptAt : null,
      lastPromptVersion:
        typeof parsed.lastPromptVersion === "string"
          ? parsed.lastPromptVersion
          : null,
    };
  } catch {
    return EMPTY_STATE;
  }
};

const writeState = (state: RatingPromptState) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));

/** Counts today as an app-open day. Call once per launch/foreground. */
export const recordAppOpenDay = async (now = new Date()): Promise<void> => {
  try {
    const state = await readState();
    const next = countOpenDay(state, now);
    if (next !== state) await writeState(next);
  } catch (error) {
    reportError("Could not record app open day for rating prompt", error);
  }
};

// Builds made before expo-store-review was added (older dev clients) have no
// native module, and importing the package there throws. Load it only when the
// module exists.
const loadStoreReview = (): typeof import("expo-store-review") | null => {
  if (!requireOptionalNativeModule("ExpoStoreReview")) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-store-review");
};

let promptInFlight = false;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const maybeRequestRating = async (
  trigger: RatingPromptTrigger,
  { delayMs = PROMPT_DELAY_MS, now = () => new Date() } = {}
): Promise<boolean> => {
  if (promptInFlight) return false;
  promptInFlight = true;
  try {
    const version = appVersion();
    const state = await readState();
    if (!isEligibleForRatingPrompt(state, trigger, version, now())) {
      return false;
    }

    const StoreReview = loadStoreReview();
    if (!StoreReview || !(await StoreReview.isAvailableAsync())) return false;

    // Record the ask before showing it, so a failure can't cause a retry loop.
    await writeState({
      ...state,
      lastPromptAt: now().toISOString(),
      lastPromptVersion: version,
    });

    if (delayMs > 0) await wait(delayMs);
    await StoreReview.requestReview();
    return true;
  } catch (error) {
    reportError("Rating prompt failed", error);
    return false;
  } finally {
    promptInFlight = false;
  }
};

/** After a member posts a review; `postedReviewCount` includes the new one. */
export const requestRatingAfterReview = (postedReviewCount: number) =>
  maybeRequestRating({ kind: "posted-review", postedReviewCount });

/** After a favorite, like or follow by a signed-in member. */
export const requestRatingAfterEngagement = () =>
  maybeRequestRating({ kind: "engagement" });

export const resetRatingPromptForTests = () => {
  promptInFlight = false;
};

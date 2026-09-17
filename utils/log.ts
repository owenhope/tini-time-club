/**
 * App-wide logging.
 *
 * Console output is dev-only. reportError also forwards through the reporter
 * registered by utils/sentry, keeping the ~130 call sites independent of the
 * telemetry SDK.
 */

type ErrorReporter = (...args: unknown[]) => void;

let errorReporter: ErrorReporter | null = null;

export const registerErrorReporter = (reporter: ErrorReporter): void => {
  errorReporter = reporter;
};

export const log = (...args: unknown[]): void => {
  if (__DEV__) {
    console.log(...args);
  }
};

export const warn = (...args: unknown[]): void => {
  if (__DEV__) {
    console.warn(...args);
  }
};

export const reportError = (...args: unknown[]): void => {
  if (__DEV__) {
    console.error(...args);
  }
  errorReporter?.(...args);
};

const NETWORK_FAILURE_PATTERN =
  /network request failed|failed to fetch|fetch failed|network connection was lost|internet connection appears to be offline|could not connect to the server|request timed out|software caused connection abort|load failed|request was aborted|aborterror|\bcancell?ed\b|hostname could not be found|dns lookup failed|connection reset|socket is not connected|network is down|secure connection to the server cannot be made/i;

/**
 * True when an error is the device losing connectivity rather than anything
 * the app or backend did wrong. These are expected in the field (elevators,
 * captive Wi-Fi, airplane mode) and the user already gets a retry path, so
 * call sites use this to keep them out of telemetry.
 */
export const isNetworkError = (value: unknown): boolean => {
  const seen = new Set<unknown>();
  let current: unknown = value;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      cause?: unknown;
      originalError?: unknown;
    };
    // Supabase clients surface transport failures as plain objects; the
    // original fetch rejection often only appears in details or hint.
    if (
      [record.message, record.details, record.hint].some(
        (field) =>
          typeof field === "string" && NETWORK_FAILURE_PATTERN.test(field)
      )
    ) {
      return true;
    }
    current = record.cause ?? record.originalError;
  }
  return typeof value === "string" && NETWORK_FAILURE_PATTERN.test(value);
};

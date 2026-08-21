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

/**
 * App-wide logging.
 *
 * Console output is dev-only: release builds were paying for string
 * formatting and native log calls on ~130 call sites that nobody could read
 * (there is no remote error reporting yet).
 *
 * reportError is the single seam where the future in-house analytics /
 * error-reporting platform plugs in — wire it up here and every existing
 * call site starts reporting.
 */

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
  // TODO(in-house platform): forward to the custom error/analytics backend.
};

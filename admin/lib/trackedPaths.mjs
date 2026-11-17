/**
 * Which pages may load third-party tracking (Meta Pixel, Google Analytics).
 *
 * The operator dashboard is never tracked, and neither are email links: the
 * unsubscribe page carries a member's token in its URL, and analytics
 * scripts report the full URL to Meta and Google.
 *
 * @param {string | null | undefined} pathname
 * @returns {boolean}
 */
export function isTrackedPath(pathname) {
  if (!pathname) return false;
  return !UNTRACKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const UNTRACKED_PREFIXES = ["/admin", "/email"];

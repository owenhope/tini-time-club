/**
 * Fixed-window, per-instance request limiter shared by the public edge
 * functions. It is a damper, not a guarantee: each function instance keeps
 * its own counters, so a client spread across instances gets proportionally
 * more. A cross-instance limit would need a shared store.
 */

/** Stop tracking new clients past this many, oldest first. */
export const MAX_TRACKED_CLIENTS = 10_000;

/**
 * The caller's address, as the first X-Forwarded-For entry. A client can
 * forge that entry and so pick a fresh bucket per request; the trustworthy
 * entry depends on how Supabase's gateway appends to the header, which is
 * unverified. Keying on a proxy-appended address could instead put every
 * caller behind one CDN node in a single bucket and block real members, so
 * this stays on the first entry until the header is measured on dev.
 */
export const clientAddress = (request: Request): string => {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
};

export const createRateLimiter = ({
  limit,
  windowMs,
  maxClients = MAX_TRACKED_CLIENTS,
}: {
  limit: number;
  windowMs: number;
  maxClients?: number;
}) => {
  const windows = new Map<string, { count: number; startedAt: number }>();

  return (request: Request, now = Date.now()): boolean => {
    const key = clientAddress(request);
    const current = windows.get(key);
    if (current && now - current.startedAt < windowMs) {
      current.count += 1;
      return current.count > limit;
    }

    // Opening a window for a new (or expired) client: keep the map bounded.
    windows.delete(key);
    if (windows.size >= maxClients) {
      for (const [staleKey, window] of windows) {
        if (now - window.startedAt >= windowMs) windows.delete(staleKey);
      }
      // Still full of live windows: evict the oldest (Map keeps insertion
      // order) rather than grow without bound under a flood of addresses.
      while (windows.size >= maxClients) {
        const oldest = windows.keys().next().value;
        if (oldest === undefined) break;
        windows.delete(oldest);
      }
    }
    windows.set(key, { count: 1, startedAt: now });
    return false;
  };
};

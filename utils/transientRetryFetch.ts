type Fetch = typeof fetch;

const RETRY_DELAYS_MS = [300, 900];
const GATEWAY_ERRORS = new Set([502, 503, 504]);

const waitForRetry = (delay: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, delay);
    signal?.addEventListener("abort", finish, { once: true });
    if (signal?.aborted) finish();
  });

/** Retry only operations whose repeated execution cannot create duplicates.
 * Keep this below Supabase's response decoding: an empty 504 otherwise loses
 * its HTTP status and becomes an unhelpful { message: "" } error.
 */
export const createTransientRetryFetch = ({
  supabaseUrl,
  fetchImpl,
}: {
  supabaseUrl: string;
  fetchImpl?: Fetch;
}): Fetch => {
  const origin = new URL(supabaseUrl).origin;
  return async (input, init) => {
    const doFetch = fetchImpl ?? fetch;
    // Supabase passes URL strings with reusable JSON bodies. Do not replay a
    // Request object or stream whose body may already have been consumed.
    const reusable = typeof input === "string" || input instanceof URL;
    const url = new URL(reusable ? String(input) : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    const safeOperation =
      (method === "GET" && url.pathname === "/rest/v1/types") ||
      (method === "POST" &&
        [
          "/rest/v1/rpc/register_push_token",
          "/rest/v1/rpc/mark_activity_seen_through",
        ].includes(url.pathname));
    const canRetry =
      reusable &&
      (init?.body == null || typeof init.body === "string") &&
      url.origin === origin &&
      safeOperation;
    let response = await doFetch(input, init);
    if (!canRetry) return response;

    for (const delay of RETRY_DELAYS_MS) {
      if (!GATEWAY_ERRORS.has(response.status) || init?.signal?.aborted) break;
      await waitForRetry(delay, init?.signal);
      if (init?.signal?.aborted) break;
      response = await doFetch(input, init);
    }
    // Persistent failures retain the original status/body for existing UI and
    // Sentry handlers; recovery never hides a sustained outage.
    return response;
  };
};

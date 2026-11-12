type Fetch = typeof fetch;

export interface SessionRetryFetchOptions {
  /** The project's anonymous key, which the client sends when it has no session. */
  anonKey: string;
  /**
   * Try to restore the member's session. Resolves to a usable access token,
   * or null when there is no session to restore.
   */
  recoverAccessToken: () => Promise<string | null>;
  fetchImpl?: Fetch;
}

const requestUrl = (input: Parameters<Fetch>[0]): string =>
  typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

/**
 * When a token refresh fails on a flaky connection (typically as the app
 * resumes), the Supabase client keeps the session but sends requests with the
 * anonymous key until the next refresh succeeds. Member-only tables and RPCs
 * then answer 401 "permission denied" even though the member is signed in.
 *
 * This wraps fetch so such a response triggers one session recovery and one
 * retry with the member's token. A genuinely signed-out caller has no session
 * to recover and gets the original response back.
 */
export const createSessionRetryFetch = ({
  anonKey,
  recoverAccessToken,
  fetchImpl,
}: SessionRetryFetchOptions): Fetch => {
  let recovery: Promise<string | null> | null = null;
  // One recovery serves every request that failed in the same burst.
  const recover = () => {
    recovery ??= recoverAccessToken()
      .catch(() => null)
      .finally(() => {
        recovery = null;
      });
    return recovery;
  };

  return async (input, init) => {
    const doFetch = fetchImpl ?? fetch;
    const response = await doFetch(input, init);
    if (response.status !== 401) return response;
    // Auth endpoints are how a session is recovered; never recurse into them.
    if (requestUrl(input).includes("/auth/v1/")) return response;

    const headers = new Headers(
      init?.headers ??
        (typeof input === "object" && "headers" in input
          ? input.headers
          : undefined)
    );
    if (headers.get("Authorization") !== `Bearer ${anonKey}`) return response;

    const accessToken = await recover();
    if (!accessToken || accessToken === anonKey) return response;

    headers.set("Authorization", `Bearer ${accessToken}`);
    return doFetch(input, { ...init, headers });
  };
};

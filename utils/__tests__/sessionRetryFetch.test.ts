import { createSessionRetryFetch } from "@/utils/sessionRetryFetch";

const ANON = "anon-key";
const response = (status: number) => ({ status }) as Response;
const authHeader = (init?: RequestInit) =>
  new Headers(init?.headers).get("Authorization");

const setup = (statuses: number[], token: string | null = "member-token") => {
  const fetchImpl = jest.fn(async (_input: unknown, _init?: RequestInit) =>
    response(statuses.shift() ?? 200)
  );
  const recoverAccessToken = jest.fn(async () => token);
  const retryFetch = createSessionRetryFetch({
    anonKey: ANON,
    recoverAccessToken,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { fetchImpl, recoverAccessToken, retryFetch };
};

const anonInit = { headers: { Authorization: `Bearer ${ANON}` } };

describe("createSessionRetryFetch", () => {
  it("retries once with the member token when a request went out as anonymous", async () => {
    const { fetchImpl, recoverAccessToken, retryFetch } = setup([401, 200]);

    const result = await retryFetch("https://x.test/rest/v1/reviews", anonInit);

    expect(result.status).toBe(200);
    expect(recoverAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(authHeader(fetchImpl.mock.calls[1][1])).toBe("Bearer member-token");
  });

  it("returns the original response when there is no session to recover", async () => {
    const { fetchImpl, retryFetch } = setup([401], null);

    const result = await retryFetch("https://x.test/rest/v1/reviews", anonInit);

    expect(result.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("leaves a member's own 401 alone", async () => {
    const { fetchImpl, recoverAccessToken, retryFetch } = setup([401]);

    await retryFetch("https://x.test/rest/v1/reviews", {
      headers: { Authorization: "Bearer member-token" },
    });

    expect(recoverAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("never retries auth endpoints", async () => {
    const { recoverAccessToken, retryFetch } = setup([401]);

    await retryFetch("https://x.test/auth/v1/token", anonInit);

    expect(recoverAccessToken).not.toHaveBeenCalled();
  });

  it("does not touch successful responses", async () => {
    const { recoverAccessToken, retryFetch } = setup([200]);

    await retryFetch("https://x.test/rest/v1/reviews", anonInit);

    expect(recoverAccessToken).not.toHaveBeenCalled();
  });

  it("shares one recovery across requests that failed together", async () => {
    const { recoverAccessToken, retryFetch } = setup([401, 401, 200, 200]);

    await Promise.all([
      retryFetch("https://x.test/rest/v1/a", anonInit),
      retryFetch("https://x.test/rest/v1/b", anonInit),
    ]);

    expect(recoverAccessToken).toHaveBeenCalledTimes(1);
  });

  it("returns the original response when recovery throws", async () => {
    const { retryFetch, recoverAccessToken } = setup([401]);
    recoverAccessToken.mockRejectedValueOnce(new Error("offline"));

    const result = await retryFetch("https://x.test/rest/v1/reviews", anonInit);

    expect(result.status).toBe(401);
  });
});

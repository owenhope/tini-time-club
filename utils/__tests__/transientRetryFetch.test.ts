import { createClient } from "@supabase/supabase-js";
import { createTransientRetryFetch } from "@/utils/transientRetryFetch";

const url = "https://example.supabase.co";
const setup = (statuses: number[], body = "null") => {
  const fetchImpl = jest.fn(async () => {
    const status = statuses.shift() ?? 200;
    return new Response(status >= 500 ? "" : body, { status });
  });
  const client = createClient(url, "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: createTransientRetryFetch({ supabaseUrl: url, fetchImpl }),
    },
  });
  return { client, fetchImpl };
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it.each(["register_push_token", "mark_activity_seen_through"])(
  "recovers %s from an empty 504 without changing the payload",
  async (name) => {
    const { client, fetchImpl } = setup([504, 200]);
    const pending = client.rpc(name, { value: "original" }).then((r) => r);
    await jest.runAllTimersAsync();
    expect((await pending).error).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]).toEqual(fetchImpl.mock.calls[0]);
  }
);

it("recovers Martini types after two gateway failures", async () => {
  const { client, fetchImpl } = setup(
    [504, 503, 200],
    '[{"id":1,"name":"Dry"}]'
  );
  const pending = client
    .from("types")
    .select("id, name")
    .then((r) => r);
  await jest.runAllTimersAsync();
  expect((await pending).data).toEqual([{ id: 1, name: "Dry" }]);
  expect(fetchImpl).toHaveBeenCalledTimes(3);
});

it("returns persistent failures to the existing error handler", async () => {
  const { client, fetchImpl } = setup([504, 504, 504, 200]);
  const pending = client
    .from("types")
    .select()
    .then((r) => r);
  await jest.runAllTimersAsync();
  expect(await pending).toMatchObject({
    status: 504,
    error: expect.anything(),
  });
  expect(fetchImpl).toHaveBeenCalledTimes(3);
});

it.each([400, 401, 403, 500])("does not retry HTTP %s", async (status) => {
  const { client, fetchImpl } = setup([status, 200]);
  const pending = client
    .from("types")
    .select()
    .then((r) => r);
  await jest.runAllTimersAsync();
  expect((await pending).status).toBe(status);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it("does not replay non-idempotent writes", async () => {
  const { client, fetchImpl } = setup([504, 200]);
  const pending = client
    .rpc("publish_review", { body: "review" })
    .then((r) => r);
  await jest.runAllTimersAsync();
  expect((await pending).status).toBe(504);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it("stops retries when the caller cancels during backoff", async () => {
  const { client, fetchImpl } = setup([504, 200]);
  const controller = new AbortController();
  const pending = client
    .from("types")
    .select()
    .abortSignal(controller.signal)
    .then((r) => r);
  await jest.advanceTimersByTimeAsync(0);
  controller.abort();
  await jest.runAllTimersAsync();
  await pending;
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each([
  ["https://other.test/rest/v1/types", "GET"],
  [`${url}/auth/v1/token`, "POST"],
  [`${url}/rest/v1/types`, "POST"],
  [`${url}/functions/v1/app-events`, "POST"],
])(
  "does not replay outside the safe operation list (%s %s)",
  async (target, method) => {
    const fetchImpl = jest.fn(async () => new Response("", { status: 504 }));
    const retryFetch = createTransientRetryFetch({
      supabaseUrl: url,
      fetchImpl,
    });
    const pending = retryFetch(target, { method });
    await jest.runAllTimersAsync();
    expect((await pending).status).toBe(504);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  }
);

it("backs off before retrying a bad gateway response", async () => {
  const { client, fetchImpl } = setup([502, 200]);
  const pending = client
    .from("types")
    .select()
    .then((r) => r);
  await jest.advanceTimersByTimeAsync(299);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  expect((await pending).error).toBeNull();
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

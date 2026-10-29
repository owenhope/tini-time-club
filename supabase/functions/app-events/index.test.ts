const mockInsert = jest.fn(async (_row: Record<string, unknown>) => ({
  error: null as { code: string } | null,
}));
const mockGetUser = jest.fn(async () => ({
  data: { user: { id: "verified-member" } },
}));
let handler: (request: Request) => Promise<Response>;
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ insert: mockInsert }),
  }),
}));

beforeAll(() => {
  Object.assign(globalThis, {
    Deno: {
      env: { get: () => "test-only" },
      serve: (callback: typeof handler) => {
        handler = callback;
      },
    },
  });
  require("./index");
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "Deno");
});
beforeEach(() => {
  mockInsert.mockClear();
  mockInsert.mockResolvedValue({ error: null });
});
const body = {
  id: "4a417008-b238-41c9-83da-6cab50032694",
  installationId: "4a417008-b238-41c9-83da-6cab50032695",
  sessionId: "4a417008-b238-41c9-83da-6cab50032696",
  event: "screen_home",
  platform: "ios",
  appEnvironment: "development",
};
const request = (event: string) =>
  new Request("https://example.test/app-events", {
    method: "POST",
    headers: {
      authorization: "Bearer test-only",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      event,
      user_id: "forged-member",
      query: "private search",
      pathname: "/users/private-name",
    }),
  });
it.each([
  "screen_home",
  "screen_passport",
  "discover_golden_glass_open",
  "favorite_saved",
  "directory_search",
  "index_generate",
])("accepts %s without arbitrary client properties", async (event) => {
  expect((await handler(request(event))).status).toBe(200);
  const row = mockInsert.mock.calls[0][0];
  expect(row).toMatchObject({
    event_name: event,
    user_id: "verified-member",
    app_environment: "development",
  });
  expect(row).not.toHaveProperty("query");
  expect(row).not.toHaveProperty("pathname");
});
it("rejects admin and unknown event names", async () => {
  expect((await handler(request("page_dashboard"))).status).toBe(400);
  expect((await handler(request("arbitrary_private_text"))).status).toBe(400);
  expect(mockInsert).not.toHaveBeenCalled();
});
it("acknowledges duplicate event IDs without a second stored event", async () => {
  mockInsert.mockResolvedValueOnce({ error: { code: "23505" } });
  expect((await handler(request("screen_home"))).status).toBe(200);
});

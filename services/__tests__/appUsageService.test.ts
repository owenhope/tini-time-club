type InvokeOptions = { body: Record<string, unknown> };
let mockAppEnvironment = "development";
const mockInvoke = jest.fn<Promise<{ error: null }>, [string, InvokeOptions]>(
  async () => ({ error: null })
);

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: "4.0.0",
      extra: {
        get environment() {
          return mockAppEnvironment;
        },
        backendEnvironment: "development",
      },
    },
  },
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("uuid", () => ({
  v4: () => "44a7f3ce-074c-476c-9871-f1c95fa8db38",
}));
jest.mock("@/services/installationIdentity", () => ({
  getInstallationId: jest.fn(
    async () => "29d59fb5-daad-41ed-b484-b7f5bcaae402"
  ),
}));
jest.mock("@/utils/supabase", () => ({
  supabase: {
    functions: {
      invoke: (name: string, options: InvokeOptions) =>
        mockInvoke(name, options),
    },
  },
}));
jest.mock("@/utils/log", () => ({ warn: jest.fn() }));

import { trackAppUsage } from "@/services/appUsageService";

beforeEach(() => {
  jest.clearAllMocks();
  mockAppEnvironment = "development";
});

it("sends installation metadata without asserting visitor or member identity", async () => {
  await expect(trackAppUsage()).resolves.toBe(true);

  expect(mockInvoke).toHaveBeenCalledWith("app-usage", {
    body: {
      installationId: "29d59fb5-daad-41ed-b484-b7f5bcaae402",
      sessionId: "44a7f3ce-074c-476c-9871-f1c95fa8db38",
      platform: "ios",
      appVersion: "4.0.0",
      appEnvironment: "development",
    },
  });
  expect(mockInvoke.mock.calls[0]?.[1]?.body).not.toHaveProperty("audience");
  expect(mockInvoke.mock.calls[0]?.[1]?.body).not.toHaveProperty("userId");
});

it("records production usage without changing the request contract", async () => {
  mockAppEnvironment = "production";

  await expect(trackAppUsage()).resolves.toBe(true);

  expect(mockInvoke).toHaveBeenCalledWith("app-usage", {
    body: expect.objectContaining({
      appEnvironment: "production",
      appVersion: "4.0.0",
      platform: "ios",
    }),
  });
});

it("sends a follow-up heartbeat when called while one is in flight", async () => {
  // A heartbeat started before sign-in carries the visitor token. A call made
  // after SIGNED_IN must not be satisfied by that stale request, or the new
  // member is never recorded with a platform.
  let releaseFirst!: () => void;
  mockInvoke.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        releaseFirst = () => resolve({ error: null });
      })
  );

  const visitorHeartbeat = trackAppUsage();
  const memberHeartbeat = trackAppUsage();
  const anotherMemberHeartbeat = trackAppUsage();
  await Promise.resolve();
  await Promise.resolve();
  releaseFirst();

  await expect(
    Promise.all([visitorHeartbeat, memberHeartbeat, anotherMemberHeartbeat])
  ).resolves.toEqual([true, true, true]);
  // One follow-up covers every call made while the first was in flight.
  expect(mockInvoke).toHaveBeenCalledTimes(2);
});

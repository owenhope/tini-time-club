type InvokeOptions = { body: Record<string, unknown> };
let mockDevelopmentBackend = true;
const mockInvoke = jest.fn<Promise<{ error: null }>, [string, InvokeOptions]>(
  async () => ({ error: null })
);

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: "4.0.0",
      extra: {
        environment: "development",
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
jest.mock("@/utils/screenshotMode", () => ({
  isDevelopmentBackend: () => mockDevelopmentBackend,
}));

import { trackAppUsage } from "@/services/appUsageService";

beforeEach(() => {
  jest.clearAllMocks();
  mockDevelopmentBackend = true;
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

it("does not call the development-only endpoint in production", async () => {
  mockDevelopmentBackend = false;

  await expect(trackAppUsage()).resolves.toBe(false);

  expect(mockInvoke).not.toHaveBeenCalled();
});

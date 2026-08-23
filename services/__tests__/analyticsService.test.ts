type InvokeOptions = { body: Record<string, unknown> };
const mockInvoke = jest.fn<
  Promise<{ error: unknown }>,
  [string, InvokeOptions]
>(async () => ({ error: null }));
let mockUuidCall = 0;

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: "4.0.2",
      extra: { environment: "production" },
    },
  },
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("uuid", () => ({
  v4: () => {
    mockUuidCall += 1;
    return mockUuidCall === 1
      ? "44a7f3ce-074c-476c-9871-f1c95fa8db38"
      : "a2f349ab-c122-4514-bb32-48b31d13517e";
  },
}));
jest.mock("@/services/installationIdentity", () => ({
  getInstallationId: async () => "29d59fb5-daad-41ed-b484-b7f5bcaae402",
}));
jest.mock("@/utils/supabase", () => ({
  supabase: {
    functions: {
      invoke: (name: string, options: InvokeOptions) =>
        mockInvoke(name, options),
    },
  },
}));
jest.mock("@/utils/log", () => ({ log: jest.fn(), warn: jest.fn() }));

import AnalyticService from "@/services/analyticsService";

beforeEach(() => {
  jest.clearAllMocks();
});

it("sends only the event name and privacy-safe app metadata", async () => {
  await expect(
    AnalyticService.capture("follow_user", {
      targetUserId: "private-user-id",
      targetUsername: "private-username",
    })
  ).resolves.toBe(true);

  expect(mockInvoke).toHaveBeenCalledWith("app-events", {
    body: {
      id: "44a7f3ce-074c-476c-9871-f1c95fa8db38",
      installationId: "29d59fb5-daad-41ed-b484-b7f5bcaae402",
      sessionId: "a2f349ab-c122-4514-bb32-48b31d13517e",
      event: "follow_user",
      platform: "ios",
      appVersion: "4.0.2",
      appEnvironment: "production",
    },
  });
  expect(mockInvoke.mock.calls[0]?.[1]?.body).not.toHaveProperty(
    "targetUserId"
  );
  expect(mockInvoke.mock.calls[0]?.[1]?.body).not.toHaveProperty(
    "targetUsername"
  );
});

it("contains delivery failures and reports false to observable callers", async () => {
  mockInvoke.mockResolvedValueOnce({ error: new Error("offline") });

  await expect(AnalyticService.capture("login")).resolves.toBe(false);
});

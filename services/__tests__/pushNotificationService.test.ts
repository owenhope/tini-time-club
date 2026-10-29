import {
  registerPushNotificationsAsync,
  unregisterPushNotificationsAsync,
} from "@/services/pushNotificationService";

const mockRpc = jest.fn();
let mockSession: unknown = { user: { id: "member-1" } };
let resolvePermissions: (value: unknown) => void = () => undefined;
const mockPermissions = new Promise((resolve) => {
  resolvePermissions = resolve;
});

jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "project" } } },
}));
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(() => mockPermissions),
  getExpoPushTokenAsync: jest.fn(async () => ({
    data: "ExponentPushToken[abc]",
  })),
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock("@/services/installationIdentity", () => ({
  getInstallationId: jest.fn(async () => "install-1"),
}));
jest.mock("@/utils/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getSession: async () => ({ data: { session: mockSession }, error: null }),
    },
  },
}));
jest.mock("@/utils/notificationRoutes", () => ({
  getNotificationRouteFromData: jest.fn(),
}));
const mockReportError = jest.fn();
jest.mock("@/utils/log", () => ({
  warn: jest.fn(),
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

it("does not re-register a token when sign-out lands mid-registration", async () => {
  mockRpc.mockResolvedValue({ error: null });

  const registration = registerPushNotificationsAsync();
  const unregistration = unregisterPushNotificationsAsync();
  resolvePermissions({ granted: true, status: "granted" });

  await expect(registration).resolves.toBeNull();
  await expect(unregistration).resolves.toBe(true);
  expect(mockRpc.mock.calls.map(([name]) => name)).toEqual([
    "unregister_push_token",
  ]);
});

it("waits for the session instead of registering as anon after a failed refresh", async () => {
  resolvePermissions({ granted: true, status: "granted" });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ error: null });
  mockReportError.mockReset();
  mockSession = null;

  await expect(registerPushNotificationsAsync()).resolves.toBeNull();
  expect(mockRpc).not.toHaveBeenCalled();
  expect(mockReportError).not.toHaveBeenCalled();

  // Once the session is back and the retry window has passed, it registers.
  mockSession = { user: { id: "member-1" } };
  const now = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 61_000);
  try {
    await expect(registerPushNotificationsAsync()).resolves.toBe(
      "ExponentPushToken[abc]"
    );
  } finally {
    now.mockRestore();
  }
  expect(mockRpc.mock.calls.map(([name]) => name)).toEqual([
    "register_push_token",
  ]);
});

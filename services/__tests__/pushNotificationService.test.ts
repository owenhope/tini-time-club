import {
  registerPushNotificationsAsync,
  unregisterPushNotificationsAsync,
} from "@/services/pushNotificationService";

const mockRpc = jest.fn();
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
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock("@/utils/notificationRoutes", () => ({
  getNotificationRouteFromData: jest.fn(),
}));
jest.mock("@/utils/log", () => ({ warn: jest.fn(), reportError: jest.fn() }));

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

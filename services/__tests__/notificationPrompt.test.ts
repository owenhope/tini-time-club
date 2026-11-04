import { Alert, type AlertButton } from "react-native";

const mockStorage = new Map<string, string>();
const mockGetPermissions = jest.fn();
const mockRegister = jest.fn(async (_options?: unknown) => "token");
const mockSyncReminder = jest.fn(async (_enabled: boolean) => undefined);
let mockPushEnabled = true;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: () => mockGetPermissions(),
}));
jest.mock("@/services/pushNotificationService", () => ({
  arePushNotificationsEnabled: () => mockPushEnabled,
  registerPushNotificationsAsync: (options: unknown) => mockRegister(options),
}));
jest.mock("@/utils/martiniReminder", () => ({
  syncFridayMartiniReminder: (enabled: boolean) => mockSyncReminder(enabled),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

import {
  offerNotificationsAfterReview,
  requestNotificationsFromSettings,
  resetNotificationPromptForTests,
  RE_ASK_AFTER_MS,
} from "@/services/notificationPrompt";

const undetermined = { granted: false, status: "undetermined" };
const NOW = 1_800_000_000_000;
let alertSpy: jest.SpyInstance;

const pressButton = async (text: string) => {
  const buttons = alertSpy.mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((button) => button.text === text)?.onPress?.();
  await new Promise((resolve) => setImmediate(resolve));
};

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
  mockPushEnabled = true;
  mockGetPermissions.mockResolvedValue(undetermined);
  resetNotificationPromptForTests();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => alertSpy.mockRestore());

describe("offerNotificationsAfterReview", () => {
  it("explains first and only asks the system after Turn on", async () => {
    await expect(
      offerNotificationsAfterReview({ fridayReminderEnabled: true, now: NOW })
    ).resolves.toBe(true);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockRegister).not.toHaveBeenCalled();

    await pressButton("Turn on");
    expect(mockRegister).toHaveBeenCalledWith({ requestPermission: true });
    expect(mockSyncReminder).toHaveBeenCalledWith(true);
  });

  it("waits two weeks after Not now before offering again", async () => {
    await offerNotificationsAfterReview({
      fridayReminderEnabled: true,
      now: NOW,
    });
    await pressButton("Not now");
    expect(mockRegister).not.toHaveBeenCalled();

    await expect(
      offerNotificationsAfterReview({
        fridayReminderEnabled: true,
        now: NOW + RE_ASK_AFTER_MS - 1,
      })
    ).resolves.toBe(false);
    await expect(
      offerNotificationsAfterReview({
        fridayReminderEnabled: true,
        now: NOW + RE_ASK_AFTER_MS,
      })
    ).resolves.toBe(true);
  });

  it.each([
    ["already allowed", { granted: true, status: "granted" }],
    ["already denied", { granted: false, status: "denied" }],
  ])("stays quiet when notifications are %s", async (_label, permissions) => {
    mockGetPermissions.mockResolvedValue(permissions);
    await expect(
      offerNotificationsAfterReview({ fridayReminderEnabled: true, now: NOW })
    ).resolves.toBe(false);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("stays quiet when push is disabled for this build", async () => {
    mockPushEnabled = false;
    await expect(
      offerNotificationsAfterReview({ fridayReminderEnabled: true, now: NOW })
    ).resolves.toBe(false);
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe("requestNotificationsFromSettings", () => {
  it("goes straight to the system dialog when it hasn't been answered", async () => {
    await requestNotificationsFromSettings(false);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRegister).toHaveBeenCalledWith({ requestPermission: true });
    expect(mockSyncReminder).toHaveBeenCalledWith(false);
  });

  it("does nothing once the system dialog has been answered", async () => {
    mockGetPermissions.mockResolvedValue({ granted: true, status: "granted" });
    await requestNotificationsFromSettings(true);
    expect(mockRegister).not.toHaveBeenCalled();
  });
});

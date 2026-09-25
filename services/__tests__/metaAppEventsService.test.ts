const mockLogEvent = jest.fn();
const mockSetAdvertiserTrackingEnabled = jest.fn(
  async (_enabled: boolean) => true
);
let mockMetaAppEventsEnabled = true;

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: { metaAppEventsEnabled: mockMetaAppEventsEnabled } };
    },
  },
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("react-native-fbsdk-next", () => ({
  AppEventsLogger: {
    AppEvents: {
      CompletedRegistration: "fb_mobile_complete_registration",
      Rated: "fb_mobile_rate",
      ViewedContent: "fb_mobile_content_view",
    },
    logEvent: (...args: unknown[]) => mockLogEvent(...args),
  },
  Settings: {
    setAdvertiserTrackingEnabled: (enabled: boolean) =>
      mockSetAdvertiserTrackingEnabled(enabled),
  },
}));
jest.mock("@/utils/log", () => ({ warn: jest.fn() }));

import {
  logMetaAppEvent,
  syncMetaAdvertiserTracking,
} from "@/services/metaAppEventsService";

beforeEach(() => {
  jest.clearAllMocks();
  mockMetaAppEventsEnabled = true;
});

it("maps completed onboarding to Meta's registration event without parameters", () => {
  logMetaAppEvent("onboarding_completed");

  expect(mockLogEvent).toHaveBeenCalledWith("fb_mobile_complete_registration");
});

it("ignores product events outside the Meta allowlist", () => {
  logMetaAppEvent("follow_user");

  expect(mockLogEvent).not.toHaveBeenCalled();
});

it("stays silent when the build has no Meta SDK configuration", () => {
  mockMetaAppEventsEnabled = false;

  logMetaAppEvent("new_review");
  syncMetaAdvertiserTracking(true);

  expect(mockLogEvent).not.toHaveBeenCalled();
  expect(mockSetAdvertiserTrackingEnabled).not.toHaveBeenCalled();
});

it("passes the App Tracking Transparency result to the Meta SDK", () => {
  syncMetaAdvertiserTracking(false);

  expect(mockSetAdvertiserTrackingEnabled).toHaveBeenCalledWith(false);
});

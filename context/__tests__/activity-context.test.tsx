import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { AppState, AppStateStatus } from "react-native";

const mockFetchUnseenActivityCount = jest.fn();
const mockReportError = jest.fn();
const mockSetActivityBadgeCount = jest.fn<Promise<void>, [number]>(
  async () => undefined
);
const mockRequestPassportReconciliation = jest.fn();

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: { id: "profile-1" } }),
}));

jest.mock("@/services/activityService", () => ({
  fetchUnseenActivityCount: (...args: unknown[]) =>
    mockFetchUnseenActivityCount(...args),
  markActivityRead: jest.fn(),
  subscribeToActivityChanges: jest.fn(() => jest.fn()),
}));

jest.mock("@/utils/log", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

jest.mock("@/utils/activityCache", () => ({
  clearActivityCache: jest.fn(),
}));

jest.mock("@/utils/activityBadge", () => ({
  setActivityBadgeCount: (count: number) => mockSetActivityBadgeCount(count),
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

jest.mock("@/utils/passport-reconciliation-events", () => ({
  requestPassportReconciliation: () => mockRequestPassportReconciliation(),
}));

import { ActivityProvider } from "@/context/activity-context";

describe("ActivityProvider", () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = undefined;
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });
    mockFetchUnseenActivityCount.mockResolvedValue(0);
  });

  afterEach(() => {
    renderer?.unmount();
    renderer = undefined;
    jest.restoreAllMocks();
  });

  it("does not report a refresh request rejected after the app backgrounds", async () => {
    await act(async () => {
      renderer = create(
        <ActivityProvider>
          <></>
        </ActivityProvider>
      );
    });

    let rejectRefresh!: (reason: unknown) => void;
    mockFetchUnseenActivityCount.mockImplementationOnce(
      () =>
        new Promise<number>((_resolve, reject) => {
          rejectRefresh = reject;
        })
    );

    await act(async () => {
      appStateListener?.("active");
    });
    appStateListener?.("background");

    await act(async () => {
      rejectRefresh({});
    });

    expect(mockReportError).not.toHaveBeenCalled();
  });

  it("reports a refresh request rejected while the app remains active", async () => {
    await act(async () => {
      renderer = create(
        <ActivityProvider>
          <></>
        </ActivityProvider>
      );
    });

    const error = { code: "42501", message: "permission denied" };
    mockFetchUnseenActivityCount.mockRejectedValueOnce(error);

    await act(async () => {
      appStateListener?.("active");
    });

    expect(mockReportError).toHaveBeenCalledWith(
      "Failed to refresh Activity badge:",
      error
    );
  });
});

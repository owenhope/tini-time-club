import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Alert } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { AppleAuth } from "@/components/AppleAuth.native";
import { reportError } from "@/utils/log";

jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock("@/utils/supabase", () => ({
  supabase: { auth: { signInWithIdToken: jest.fn() } },
}));
jest.mock("@/services/analyticsService", () => ({ capture: jest.fn() }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@/components/AuthProviderButton", () => ({
  AuthProviderButton: () => null,
}));
jest.mock("@/theme", () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock("@/utils/log", () => ({ reportError: jest.fn(), warn: jest.fn() }));

const signInFailure = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

describe("AppleAuth", () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(() => {
    act(() => renderer?.unmount());
    jest.restoreAllMocks();
    (reportError as jest.Mock).mockClear();
  });

  const pressContinue = async () => {
    await act(async () => {
      renderer = create(<AppleAuth />);
    });
    const { AuthProviderButton } = jest.requireMock(
      "@/components/AuthProviderButton"
    );
    const button = renderer!.root.findByType(AuthProviderButton);
    await act(async () => {
      await button.props.onPress();
    });
  };

  it("explains a device without an Apple Account instead of reporting it", async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(
      signInFailure(
        "ERR_REQUEST_UNKNOWN",
        "The authorization attempt failed for an unknown reason"
      )
    );
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    await pressContinue();

    expect(reportError).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Apple Sign-In Unavailable",
      expect.stringContaining("Apple Account in Settings")
    );
  });

  it("still reports other Apple Sign-In failures", async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(
      signInFailure("ERR_REQUEST_FAILED", "The authorization attempt failed")
    );
    jest.spyOn(Alert, "alert").mockImplementation(() => {});

    await pressContinue();

    expect(reportError).toHaveBeenCalledTimes(1);
  });
});

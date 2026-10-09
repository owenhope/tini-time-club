import React from "react";
import { Alert, Platform } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuth } from "@/components/GoogleAuth.native";
import { AuthProviderButton } from "@/components/AuthProviderButton";
import { supabase } from "@/utils/supabase";

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ data: { idToken: "test-id-token" } })),
  },
  isCancelledResponse: jest.fn(() => false),
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
}));
jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: { signInWithIdToken: jest.fn(async () => ({ error: null })) },
  },
}));
jest.mock("@/services/analyticsService", () => ({ capture: jest.fn() }));
jest.mock("@/theme", () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock("@/components/AuthProviderButton", () => ({
  AuthProviderButton: () => null,
}));

describe("Android Google authentication", () => {
  const originalPlatform = Platform.OS;
  const originalClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  let renderer: TestRenderer.ReactTestRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "android";
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    Platform.OS = originalPlatform;
    if (originalClientId === undefined) {
      delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    } else {
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalClientId;
    }
    jest.restoreAllMocks();
  });

  async function pressSignIn() {
    act(() => {
      renderer = TestRenderer.create(<GoogleAuth />);
    });
    expect(GoogleSignin.configure).not.toHaveBeenCalled();
    await act(async () => {
      await renderer.root.findByType(AuthProviderButton).props.onPress();
    });
  }

  it("uses the Web OAuth client and exchanges the resulting ID token", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
      "web.apps.googleusercontent.com";
    await pressSignIn();
    expect(GoogleSignin.configure).toHaveBeenCalledWith(
      expect.objectContaining({ webClientId: "web.apps.googleusercontent.com" })
    );
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "test-id-token",
    });
  });

  it("does not fall back to an iOS client when Android configuration is missing", async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    await pressSignIn();
    expect(GoogleSignin.signIn).not.toHaveBeenCalled();
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Google Sign-In Unavailable",
      expect.stringContaining("Please use email sign-in")
    );
  });
});

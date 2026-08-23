import AsyncStorage from "@react-native-async-storage/async-storage";
import { reportError } from "@/utils/log";
import {
  markExpectedSignOut,
  recordSignedIn,
  runExpectedSignOut,
  trackInitialSession,
  trackSignedOut,
} from "@/utils/authTelemetry";

const mockCapture = jest.fn(async (..._args: unknown[]) => true);

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock"
  )
);

jest.mock("@/utils/log", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  reportError: jest.fn(),
}));
jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

const LAST_SIGNED_IN_KEY = "auth_last_signed_in";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  // Drain any expected-sign-out mark left by a previous test.
  await trackSignedOut();
  (reportError as jest.Mock).mockClear();
  mockCapture.mockClear();
});

describe("trackSignedOut", () => {
  it("reports a sign-out no screen asked for", async () => {
    await recordSignedIn();
    await trackSignedOut();

    expect(reportError).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected sign-out")
    );
    expect(mockCapture).toHaveBeenCalledWith("auth_unexpected_sign_out");
    expect(await AsyncStorage.getItem(LAST_SIGNED_IN_KEY)).toBeNull();
  });

  it("stays quiet for a marked, intentional sign-out", async () => {
    await recordSignedIn();
    markExpectedSignOut("settings-sign-out");
    await trackSignedOut();

    expect(reportError).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(LAST_SIGNED_IN_KEY)).toBeNull();
  });

  it("consumes the mark, so the next sign-out is unexpected again", async () => {
    markExpectedSignOut("settings-sign-out");
    await trackSignedOut();
    await trackSignedOut();

    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("ignores a stale mark from a sign-out that never completed", async () => {
    const now = Date.now();
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);
    markExpectedSignOut("settings-sign-out");
    nowSpy.mockReturnValue(now + 61_000);

    await trackSignedOut();
    expect(reportError).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected sign-out")
    );
    nowSpy.mockRestore();
  });

  it("clears the expected marker when an intentional sign-out fails", async () => {
    await runExpectedSignOut("settings-sign-out", async () => ({
      error: new Error("network unavailable"),
    }));

    await trackSignedOut();
    expect(reportError).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected sign-out")
    );
  });
});

describe("trackInitialSession", () => {
  it("reports a session that vanished between launches", async () => {
    await trackInitialSession(true); // previous run: signed in
    await trackInitialSession(false); // this launch: session gone

    expect(reportError).toHaveBeenCalledWith(
      expect.stringContaining("Session missing at launch")
    );
    expect(mockCapture).toHaveBeenCalledWith("auth_session_missing_at_launch");
    // One report per loss, not one per subsequent launch.
    (reportError as jest.Mock).mockClear();
    await trackInitialSession(false);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("stays quiet when the launch is signed in", async () => {
    await trackInitialSession(true);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("stays quiet on a fresh install that was never signed in", async () => {
    await trackInitialSession(false);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("stays quiet after an intentional sign-out in the previous run", async () => {
    await trackInitialSession(true);
    markExpectedSignOut("settings-sign-out");
    await trackSignedOut(); // clears the signed-in marker

    await trackInitialSession(false);
    expect(reportError).not.toHaveBeenCalled();
  });
});

const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();
const mockAddBreadcrumb = jest.fn();

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setTag: jest.fn(),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
  flush: jest.fn(async () => undefined),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { environment: "production" } } },
}));

jest.mock("expo-updates", () => ({ manifest: null }));

import { reportError } from "@/utils/log";
import "@/utils/sentry";

describe("Sentry reportError bridge", () => {
  beforeEach(() => {
    mockCaptureException.mockClear();
    mockCaptureMessage.mockClear();
    mockAddBreadcrumb.mockClear();
  });

  it("captures Error instances with their call-site context", () => {
    const error = new Error("network unavailable");

    reportError("Failed to load reviews:", error);

    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      extra: { context: "Failed to load reviews:" },
    });
  });

  it("captures message-only failures at error level", () => {
    reportError("No photo to upload");

    expect(mockCaptureMessage).toHaveBeenCalledWith("No photo to upload", {
      level: "error",
      extra: undefined,
    });
  });

  it("keeps offline fetch failures out of telemetry, leaving a breadcrumb", () => {
    reportError(
      "Error uploading image:",
      new TypeError("Network request failed")
    );

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "network" })
    );
  });

  it("filters network failures wrapped as an error cause", () => {
    const wrapped = new Error("Review publishing transaction failed.", {
      cause: new TypeError("Network request failed"),
    });

    reportError("Error submitting review:", wrapped);

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalled();
  });

  it("filters supabase-style error objects raised while offline", () => {
    reportError("Failed to refresh Activity badge:", {
      message: "TypeError: Network request failed",
      details: "",
      code: "",
    });

    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalled();
  });

  it("filters storage-js transport failures (fetch failed prefix)", () => {
    const error = new Error(
      "fetch failed: UnexpectedException: The network connection was lost. (at ExpoModulesCore/Promise.swift:56)"
    );
    error.name = "StorageUnknownError";

    reportError("Error removing review image:", error);

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalled();
  });

  it("filters storage-js request timeouts", () => {
    const error = new Error(
      "fetch failed: UnexpectedException: The request timed out. (at ExpoModulesCore/Promise.swift:56)"
    );
    error.name = "StorageUnknownError";

    reportError("Failed to cache Activity:", error);

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "network",
        message: "Failed to cache Activity:",
      })
    );
  });

  it("filters iOS request suspensions surfaced as 'cancelled'", () => {
    // iOS kills in-flight requests when the app backgrounds; RN surfaces
    // NSURLErrorCancelled as a bare "cancelled" message.
    reportError("Failed to refresh Activity badge:", {
      message: "TypeError: cancelled",
      details: "",
      hint: "",
      code: "",
    });

    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "network" })
    );
  });

  it("filters aborted requests via the postgrest hint field", () => {
    reportError("Failed to refresh Activity badge:", {
      message: "AbortError: Aborted",
      details: "",
      hint: "Request was aborted (timeout or manual cancellation)",
      code: "",
    });

    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalled();
  });

  it("filters transport failures only visible in the details field", () => {
    reportError("Failed to refresh Activity badge:", {
      message: "FetchError: something went wrong",
      details:
        "FetchError: something went wrong\n\nCaused by: Error: The network connection was lost.",
      hint: "",
      code: "",
    });

    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalled();
  });

  it("includes non-Error object messages in captured messages", () => {
    reportError("Failed to refresh Activity badge:", {
      message: "permission denied for table notifications",
      code: "42501",
    });

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      "Failed to refresh Activity badge: permission denied for table notifications",
      {
        level: "error",
        extra: {
          error: {
            message: "permission denied for table notifications",
            code: "42501",
          },
        },
      }
    );
  });

  it("still captures non-network storage failures", () => {
    const error = new Error("new row violates row-level security policy");

    reportError("Error uploading image:", error);

    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      extra: { context: "Error uploading image:" },
    });
    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });
});

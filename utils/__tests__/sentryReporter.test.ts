const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setTag: jest.fn(),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
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
});

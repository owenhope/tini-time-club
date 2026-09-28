import {
  createSessionFromAuthUrl,
  isAuthCallbackUrl,
} from "@/utils/authDeepLink";
import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { AppState, type AppStateStatus } from "react-native";
import { supabase } from "@/utils/supabase";

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
    },
  },
}));

// expo-linking's parse() consults Constants.expoConfig.hostUri (the Metro dev
// host), which is undefined under jest and makes parse() throw.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "localhost:8081" } },
}));

const setSession = supabase.auth.setSession as jest.Mock;

const session = { user: { id: "user-1" } };

const initialAppState = AppState.currentState;

const cancelledFetch = () =>
  new AuthRetryableFetchError(
    "fetch failed: UnexpectedException: cancelled",
    0
  );

beforeEach(() => {
  jest.clearAllMocks();
  AppState.currentState = "active";
  setSession.mockResolvedValue({ data: { session }, error: null });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  AppState.currentState = initialAppState;
});

describe("isAuthCallbackUrl", () => {
  it.each([
    "tinitimeclub://auth",
    "tinitimeclub://auth?code=abc",
    "tinitimeclub://auth#access_token=a&refresh_token=b",
    "https://tinitime.club/auth/callback",
    "https://tinitime.club/auth/callback?code=abc",
  ])("recognises the auth callback URL %s", (url) => {
    expect(isAuthCallbackUrl(url)).toBe(true);
  });

  it.each([
    "tinitimeclub://places/42",
    "tinitimeclub://users/martini_fan",
    "https://tinitime.club/places",
    "https://tinitime.club/",
  ])("treats %s as an ordinary deep link", (url) => {
    expect(isAuthCallbackUrl(url)).toBe(false);
  });
});

describe("createSessionFromAuthUrl", () => {
  it("extracts tokens delivered in the URL fragment", async () => {
    const result = await createSessionFromAuthUrl(
      "tinitimeclub://auth#access_token=AT&refresh_token=RT&token_type=bearer"
    );

    expect(setSession).toHaveBeenCalledWith({
      access_token: "AT",
      refresh_token: "RT",
    });
    expect(result).toBe(session);
  });

  it("extracts tokens delivered as ordinary query params", async () => {
    const result = await createSessionFromAuthUrl(
      "tinitimeclub://auth?access_token=AT&refresh_token=RT"
    );

    expect(setSession).toHaveBeenCalledWith({
      access_token: "AT",
      refresh_token: "RT",
    });
    expect(result).toBe(session);
  });

  it("merges fragment params into an existing query string", async () => {
    const result = await createSessionFromAuthUrl(
      "tinitimeclub://auth?foo=1#access_token=AT&refresh_token=RT"
    );

    expect(setSession).toHaveBeenCalledWith({
      access_token: "AT",
      refresh_token: "RT",
    });
    expect(result).toBe(session);
  });

  it("decodes '+'-encoded spaces in the provider error message", async () => {
    await expect(
      createSessionFromAuthUrl(
        "tinitimeclub://auth#error=access_denied&error_description=Email+link+is+invalid+or+has+expired"
      )
    ).rejects.toThrow("Email link is invalid or has expired");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("returns null without touching supabase when the access token is missing", async () => {
    await expect(
      createSessionFromAuthUrl("tinitimeclub://auth#refresh_token=RT")
    ).resolves.toBeNull();
    expect(setSession).not.toHaveBeenCalled();
  });

  it("returns null without touching supabase when the refresh token is missing", async () => {
    await expect(
      createSessionFromAuthUrl("tinitimeclub://auth#access_token=AT")
    ).resolves.toBeNull();
    expect(setSession).not.toHaveBeenCalled();
  });

  it("propagates a setSession failure", async () => {
    const failure = new Error("invalid refresh token");
    setSession.mockResolvedValue({ data: { session: null }, error: failure });

    await expect(
      createSessionFromAuthUrl(
        "tinitimeclub://auth#access_token=AT&refresh_token=RT"
      )
    ).rejects.toBe(failure);
  });

  // Note: the empty string is the one input expo-linking itself rejects
  // (Invariant Violation: "Invalid URL: cannot be empty"); pinned below.
  it("rejects an empty URL via expo-linking's own invariant", async () => {
    await expect(createSessionFromAuthUrl("")).rejects.toThrow(
      "Invalid URL: cannot be empty"
    );
    expect(setSession).not.toHaveBeenCalled();
  });

  it.each(["not a url", "::::", "tinitimeclub://auth#"])(
    "does not throw on the malformed or token-less URL %j",
    async (url) => {
      await expect(createSessionFromAuthUrl(url)).resolves.toBeNull();
      expect(setSession).not.toHaveBeenCalled();
    }
  );

  it("retries the token exchange when iOS cancels the request", async () => {
    jest.useFakeTimers();
    setSession
      .mockResolvedValueOnce({
        data: { session: null },
        error: cancelledFetch(),
      })
      .mockResolvedValueOnce({ data: { session }, error: null });

    const result = createSessionFromAuthUrl(
      "tinitimeclub://auth#access_token=AT&refresh_token=RT"
    );
    await jest.advanceTimersByTimeAsync(500);

    await expect(result).resolves.toBe(session);
    expect(setSession).toHaveBeenCalledTimes(2);
  });

  it("gives up after three cancelled attempts", async () => {
    jest.useFakeTimers();
    const failure = cancelledFetch();
    setSession.mockResolvedValue({ data: { session: null }, error: failure });

    const result = createSessionFromAuthUrl(
      "tinitimeclub://auth#access_token=AT&refresh_token=RT"
    );
    const assertion = expect(result).rejects.toBe(failure);
    await jest.advanceTimersByTimeAsync(1500);

    await assertion;
    expect(setSession).toHaveBeenCalledTimes(3);
  });

  it("waits for the app to reach the foreground before exchanging tokens", async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    AppState.currentState = "background";
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_, listener) => {
        onChange = listener as (state: AppStateStatus) => void;
        return { remove } as ReturnType<typeof AppState.addEventListener>;
      });

    const result = createSessionFromAuthUrl(
      "tinitimeclub://auth#access_token=AT&refresh_token=RT"
    );
    await Promise.resolve();
    expect(setSession).not.toHaveBeenCalled();

    onChange?.("active");

    await expect(result).resolves.toBe(session);
    expect(remove).toHaveBeenCalled();
    expect(setSession).toHaveBeenCalledTimes(1);
  });
});

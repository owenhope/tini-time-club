import {
  createSessionFromAuthUrl,
  isAuthCallbackUrl,
} from "@/utils/authDeepLink";
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

beforeEach(() => {
  jest.clearAllMocks();
  setSession.mockResolvedValue({ data: { session }, error: null });
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
});

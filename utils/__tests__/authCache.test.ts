import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/utils/supabase";
import authCache from "@/utils/authCache";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
  supabaseProjectRef: "testref",
}));

jest.mock("@/utils/log", () => ({
  log: jest.fn(),
  reportError: jest.fn(),
}));

// Must match PROFILE_CACHE_KEY in utils/authCache.ts with the mocked ref.
const PROFILE_CACHE_KEY = "profile_cache_testref";
const PROFILE_CACHE_VERSION = 3;
const DAY = 24 * 60 * 60 * 1000;

const getSession = supabase.auth.getSession as jest.Mock;
const from = supabase.from as jest.Mock;

const signInAs = (userId: string) => {
  getSession.mockResolvedValue({
    data: { session: { user: { id: userId } } },
    error: null,
  });
};

/** Wires supabase.from("profiles")...single() to resolve with `result`. */
const respondWith = (result: { data: any; error: any } | Promise<any>) => {
  const single = jest.fn(() =>
    result instanceof Promise ? result : Promise.resolve(result)
  );
  from.mockReturnValue({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({ single })),
      })),
    })),
  });
  return single;
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  // authCache is a singleton, so in-memory state leaks between tests unless
  // explicitly cleared.
  await authCache.clearCache();
});

describe("authCache.getProfile", () => {
  it("fetches once, then serves the cached profile", async () => {
    signInAs("u1");
    const profile = { id: "u1", username: "owen", is_verified: true };
    respondWith({ data: profile, error: null });

    expect(await authCache.getProfile()).toEqual(profile);
    expect(await authCache.getProfile()).toEqual(profile);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("returns null and never queries when there is no session", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    expect(await authCache.getProfile()).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("refetches when the cached profile predates the is_verified column", async () => {
    signInAs("u1");
    respondWith({ data: { id: "u1", username: "owen" }, error: null });
    await authCache.getProfile();

    const upgraded = { id: "u1", username: "owen", is_verified: false };
    respondWith({ data: upgraded, error: null });

    expect(await authCache.getProfile()).toEqual(upgraded);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("clears the persisted cache and refetches when the user changes", async () => {
    signInAs("u1");
    respondWith({
      data: { id: "u1", username: "owen", is_verified: true },
      error: null,
    });
    await authCache.getProfile();

    signInAs("u2");
    const otherProfile = { id: "u2", username: "guest", is_verified: false };
    respondWith({ data: otherProfile, error: null });

    expect(await authCache.getProfile()).toEqual(otherProfile);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(PROFILE_CACHE_KEY);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("expires the in-memory cache after its TTL", async () => {
    const nowSpy = jest.spyOn(Date, "now");
    let now = 1_700_000_000_000;
    nowSpy.mockImplementation(() => now);

    try {
      signInAs("u1");
      const profile = { id: "u1", username: "owen", is_verified: true };
      respondWith({ data: profile, error: null });
      await authCache.getProfile();

      now += DAY + 1;
      respondWith({ data: profile, error: null });
      await authCache.getProfile();

      expect(from).toHaveBeenCalledTimes(2);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("dedupes concurrent requests through pendingRequests", async () => {
    signInAs("u1");
    const profile = { id: "u1", username: "owen", is_verified: true };
    let release!: (value: { data: any; error: any }) => void;
    respondWith(new Promise((resolve) => (release = resolve)));

    const first = authCache.getProfile();
    const second = authCache.getProfile();
    // Let both calls get past their session lookups so they reach the
    // pendingRequests map while the profile fetch is still in flight.
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
    expect(authCache.getCacheStats().pendingRequests).toBe(1);

    release({ data: profile, error: null });
    const [a, b] = await Promise.all([first, second]);

    expect(a).toBe(b);
    expect(a).toEqual(profile);
    expect(from).toHaveBeenCalledTimes(1);
    expect(authCache.getCacheStats().pendingRequests).toBe(0);
  });

  it("returns null when the profile fetch errors", async () => {
    signInAs("u1");
    respondWith({ data: null, error: { code: "PGRST116" } });

    expect(await authCache.getProfile()).toBeNull();
  });
});

describe("authCache.loadFromStorage", () => {
  const storedEntry = (overrides: Partial<Record<string, any>> = {}) => ({
    profile: { id: "u1", username: "owen", is_verified: true },
    timestamp: Date.now(),
    expiresAt: Date.now() + DAY,
    version: PROFILE_CACHE_VERSION,
    ...overrides,
  });

  it("hydrates a valid persisted profile so getProfile skips the network", async () => {
    await AsyncStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify(storedEntry())
    );
    await authCache.loadFromStorage();

    signInAs("u1");
    expect(await authCache.getProfile()).toEqual(storedEntry().profile);
    expect(from).not.toHaveBeenCalled();
  });

  it("discards a persisted profile written by an older cache version", async () => {
    await AsyncStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify(storedEntry({ version: PROFILE_CACHE_VERSION - 1 }))
    );
    await authCache.loadFromStorage();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(PROFILE_CACHE_KEY);
    expect(await AsyncStorage.getItem(PROFILE_CACHE_KEY)).toBeNull();
    expect(authCache.getCacheStats().hasProfile).toBe(false);
  });

  it("discards a persisted profile that lacks is_verified", async () => {
    const entry: any = storedEntry();
    delete entry.profile.is_verified;
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(entry));
    await authCache.loadFromStorage();

    expect(await AsyncStorage.getItem(PROFILE_CACHE_KEY)).toBeNull();
    expect(authCache.getCacheStats().hasProfile).toBe(false);
  });

  it("discards an expired persisted profile", async () => {
    await AsyncStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify(storedEntry({ expiresAt: Date.now() - 1 }))
    );
    await authCache.loadFromStorage();

    expect(await AsyncStorage.getItem(PROFILE_CACHE_KEY)).toBeNull();
    expect(authCache.getCacheStats().hasProfile).toBe(false);
  });

  it("always scrubs the legacy plaintext caches", async () => {
    await authCache.loadFromStorage();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("auth_cache");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("profile_cache");
  });
});

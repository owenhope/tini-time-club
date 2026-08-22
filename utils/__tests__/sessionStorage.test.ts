import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";
import { LargeSecureStore } from "@/utils/sessionStorage";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock"
  )
);

// In-memory Keychain with injectable failures.
const mockKeychain = new Map<string, string>();
const mockKeychainState = { locked: false, readFailuresRemaining: 0 };
const mockLockedError = () =>
  new Error(
    "KeyChainException: User interaction is not allowed. (at ExpoSecureStore/SecureStoreModule.swift:168)"
  );

jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: 1,
  getItemAsync: jest.fn(async (key: string) => {
    if (
      mockKeychainState.locked ||
      mockKeychainState.readFailuresRemaining-- > 0
    ) {
      throw mockLockedError();
    }
    return mockKeychain.get(key) ?? null;
  }),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    if (mockKeychainState.locked) throw mockLockedError();
    mockKeychain.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    if (mockKeychainState.locked) throw mockLockedError();
    mockKeychain.delete(key);
  }),
}));

jest.mock("@/utils/log", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  reportError: jest.fn(),
}));

const STORAGE_KEY = "sb-testref-auth-token";
const ENCRYPTION_KEY_STORAGE_KEY = "supabase.session.encryption-key";
const SESSION = JSON.stringify({
  access_token: "at",
  refresh_token: "rt",
  expires_at: 1234567890,
  user: { id: "user-1" },
});

/** Build a v1 record: per-key AES key in the mockKeychain, hex ciphertext in AsyncStorage. */
const seedLegacyV1 = async (value: string) => {
  const legacyKey = crypto.getRandomValues(new Uint8Array(32));
  const cipher = new aesjs.ModeOfOperation.ctr(legacyKey, new aesjs.Counter(1));
  mockKeychain.set(STORAGE_KEY, aesjs.utils.hex.fromBytes(legacyKey));
  await AsyncStorage.setItem(
    STORAGE_KEY,
    aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)))
  );
};

beforeEach(async () => {
  mockKeychain.clear();
  mockKeychainState.locked = false;
  mockKeychainState.readFailuresRemaining = 0;
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe("LargeSecureStore", () => {
  it("round-trips a session", async () => {
    const store = new LargeSecureStore();
    await store.setItem(STORAGE_KEY, SESSION);
    expect(await store.getItem(STORAGE_KEY)).toBe(SESSION);
    // Stored encrypted, not in plaintext.
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toContain("access_token");
    expect(JSON.parse(raw!)).toMatchObject({ v: 2 });
  });

  it("round-trips JSON scalar values used by Supabase auth", async () => {
    const store = new LargeSecureStore();
    const codeVerifier = JSON.stringify("verifier-value");

    await store.setItem(`${STORAGE_KEY}-code-verifier`, codeVerifier);

    expect(await store.getItem(`${STORAGE_KEY}-code-verifier`)).toBe(
      codeVerifier
    );
  });

  it("stores the stable key with AFTER_FIRST_UNLOCK accessibility", async () => {
    const store = new LargeSecureStore();
    await store.setItem(STORAGE_KEY, SESSION);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      ENCRYPTION_KEY_STORAGE_KEY,
      expect.any(String),
      { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }
    );
  });

  it("reuses one master key across writes, so an interrupted write preserves the last session", async () => {
    const store = new LargeSecureStore();
    await store.setItem(STORAGE_KEY, SESSION);

    // A refresh whose AsyncStorage write dies mid-flight. (The async-storage
    // jest mock's setItem is already a jest.fn; Once falls back to its real
    // implementation for later writes.)
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error("write interrupted")
    );
    await expect(
      store.setItem(STORAGE_KEY, JSON.stringify({ access_token: "new" }))
    ).rejects.toThrow("write interrupted");

    // The previous session must still decrypt — this was the v1 defect, where
    // the fresh per-write key had already replaced the old one.
    expect(await store.getItem(STORAGE_KEY)).toBe(SESSION);
    // And a fresh adapter instance (new app launch) can read it too.
    expect(await new LargeSecureStore().getItem(STORAGE_KEY)).toBe(SESSION);
  });

  it("shares one key between concurrent first writes", async () => {
    const store = new LargeSecureStore();
    const verifierKey = `${STORAGE_KEY}-code-verifier`;
    const verifier = JSON.stringify("verifier-value");

    await Promise.all([
      store.setItem(STORAGE_KEY, SESSION),
      store.setItem(verifierKey, verifier),
    ]);

    // Both payloads must decrypt on a fresh launch, so exactly one key was created.
    const relaunched = new LargeSecureStore();
    expect(await relaunched.getItem(STORAGE_KEY)).toBe(SESSION);
    expect(await relaunched.getItem(verifierKey)).toBe(verifier);
  });

  it("retries a transient Keychain read instead of reporting no session", async () => {
    const store = new LargeSecureStore();
    await store.setItem(STORAGE_KEY, SESSION);

    (SecureStore.getItemAsync as jest.Mock).mockClear();
    mockKeychainState.readFailuresRemaining = 2;
    expect(await new LargeSecureStore().getItem(STORAGE_KEY)).toBe(SESSION);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(3);
  });

  it("fails a write while the keychain is locked without clobbering the stored session", async () => {
    const store = new LargeSecureStore();
    await store.setItem(STORAGE_KEY, SESSION);

    mockKeychainState.locked = true;
    await expect(
      new LargeSecureStore().setItem(STORAGE_KEY, "{}")
    ).rejects.toThrow();

    mockKeychainState.locked = false;
    expect(await new LargeSecureStore().getItem(STORAGE_KEY)).toBe(SESSION);
  });

  it("migrates a legacy v1 record and keeps the user signed in", async () => {
    await seedLegacyV1(SESSION);
    const store = new LargeSecureStore();

    expect(await store.getItem(STORAGE_KEY)).toBe(SESSION);
    // Re-stored as v2 and the per-key legacy mockKeychain entry cleaned up.
    expect(
      JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!)
    ).toMatchObject({ v: 2 });
    expect(mockKeychain.has(STORAGE_KEY)).toBe(false);
    expect(await new LargeSecureStore().getItem(STORAGE_KEY)).toBe(SESSION);
  });

  it("reads a legacy v1 record while locked without deleting it", async () => {
    await seedLegacyV1(SESSION);

    mockKeychainState.locked = true;
    await expect(new LargeSecureStore().getItem(STORAGE_KEY)).rejects.toThrow(
      "Keychain unavailable"
    );

    mockKeychainState.locked = false;
    expect(await new LargeSecureStore().getItem(STORAGE_KEY)).toBe(SESSION);
  });

  it("migrates a legacy plaintext session", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, SESSION);
    const store = new LargeSecureStore();

    expect(await store.getItem(STORAGE_KEY)).toBe(SESSION);
    expect(
      JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!)
    ).toMatchObject({ v: 2 });
  });

  it("migrates a legacy plaintext JSON scalar", async () => {
    const codeVerifierKey = `${STORAGE_KEY}-code-verifier`;
    const codeVerifier = JSON.stringify("legacy-verifier");
    await AsyncStorage.setItem(codeVerifierKey, codeVerifier);

    const store = new LargeSecureStore();
    expect(await store.getItem(codeVerifierKey)).toBe(codeVerifier);
    expect(
      JSON.parse((await AsyncStorage.getItem(codeVerifierKey))!)
    ).toMatchObject({ v: 2 });
  });

  it("rejects a malformed versioned envelope instead of treating it as plaintext", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, iv: "00" }));

    expect(await new LargeSecureStore().getItem(STORAGE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null for a v1 record whose key is gone (unrecoverable) without throwing", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "deadbeef");
    expect(await new LargeSecureStore().getItem(STORAGE_KEY)).toBeNull();
  });

  it("discards a corrupted payload instead of returning garbage", async () => {
    const store = new LargeSecureStore();
    await store.setItem(STORAGE_KEY, SESSION);

    const raw = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
    raw.data = `${raw.data[0] === "0" ? "1" : "0"}${raw.data.slice(1)}`;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    expect(await new LargeSecureStore().getItem(STORAGE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("removeItem clears the session but keeps the master key for the next sign-in", async () => {
    const store = new LargeSecureStore();
    await store.setItem(STORAGE_KEY, SESSION);
    await store.removeItem(STORAGE_KEY);

    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(mockKeychain.has(ENCRYPTION_KEY_STORAGE_KEY)).toBe(true);
    // Sign back in with the same adapter.
    await store.setItem(STORAGE_KEY, SESSION);
    expect(await store.getItem(STORAGE_KEY)).toBe(SESSION);
  });
});

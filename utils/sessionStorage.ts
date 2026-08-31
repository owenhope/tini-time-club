import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";
import { reportError, warn } from "./log";

/**
 * Encrypted Supabase auth storage for React Native.
 *
 * SecureStore (Keychain/Keystore) caps values at ~2KB, which a Supabase
 * session exceeds, so one stable AES-256 key lives in the Keychain and the
 * AES-CTR-encrypted payload lives in AsyncStorage. Because the key is stable,
 * a token refresh changes only the AsyncStorage record — an interrupted write
 * can no longer strand a session encrypted with a key that was already
 * replaced (the defect in the original per-write-key adapter).
 */

const ENCRYPTION_KEY_STORAGE_KEY = "supabase.session.encryption-key";
const PAYLOAD_VERSION = 2;
const KEY_BYTES = 32;
const KEYCHAIN_RETRY_DELAYS_MS = [0, 25, 75] as const;

const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

interface EncryptedPayload {
  v: 2;
  iv: string;
  data: string;
}

interface ParsedJson {
  ok: boolean;
  value?: unknown;
}

/** Keychain is temporarily inaccessible, rather than definitively empty. */
class KeychainUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Keychain unavailable");
    this.name = "KeychainUnavailableError";
    (this as { cause?: unknown }).cause = cause;
  }
}

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const parseJson = (value: string): ParsedJson => {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isHex = (value: unknown, expectedBytes?: number): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length % 2 === 0 &&
  /^[0-9a-f]+$/i.test(value) &&
  (expectedBytes === undefined || value.length === expectedBytes * 2);

const isEncryptedPayload = (value: unknown): value is EncryptedPayload =>
  isRecord(value) &&
  value.v === PAYLOAD_VERSION &&
  isHex(value.iv, 16) &&
  isHex(value.data);

const isVersionedEnvelope = (value: unknown): boolean =>
  isRecord(value) && typeof value.v === "number";

export class LargeSecureStore {
  private key: Uint8Array | null = null;
  private creating: Promise<Uint8Array> | null = null;

  private async readSecureValue(key: string): Promise<string | null> {
    let lastError: unknown;
    for (const delay of KEYCHAIN_RETRY_DELAYS_MS) {
      if (delay) await wait(delay);
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        lastError = error;
      }
    }
    throw new KeychainUnavailableError(lastError);
  }

  private async writeSecureValue(key: string, value: string): Promise<void> {
    let lastError: unknown;
    for (const delay of KEYCHAIN_RETRY_DELAYS_MS) {
      if (delay) await wait(delay);
      try {
        await SecureStore.setItemAsync(key, value, KEYCHAIN_OPTIONS);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw new KeychainUnavailableError(lastError);
  }

  private async getKey(createIfMissing: boolean): Promise<Uint8Array | null> {
    if (this.key) return this.key;
    if (this.creating) return this.creating;

    const storedHex = await this.readSecureValue(ENCRYPTION_KEY_STORAGE_KEY);
    // A concurrent create may have finished while we were reading.
    if (this.key) return this.key;
    if (storedHex) {
      if (isHex(storedHex, KEY_BYTES)) {
        this.key = Uint8Array.from(aesjs.utils.hex.toBytes(storedHex));
        return this.key;
      }
      reportError("[SessionStore] Stored encryption key is malformed.");
      await SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORAGE_KEY).catch(
        () => {}
      );
    }
    if (!createIfMissing) return null;

    // Deduplicate concurrent first writes: two setItem calls creating separate
    // keys would leave one payload permanently unreadable.
    if (!this.creating) {
      this.creating = (async () => {
        const fresh = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
        await this.writeSecureValue(
          ENCRYPTION_KEY_STORAGE_KEY,
          aesjs.utils.hex.fromBytes(fresh)
        );
        this.key = fresh;
        return fresh;
      })().finally(() => {
        this.creating = null;
      });
    }
    return this.creating;
  }

  private encrypt(encryptionKey: Uint8Array, value: string): EncryptedPayload {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(iv)
    );
    return {
      v: PAYLOAD_VERSION,
      iv: aesjs.utils.hex.fromBytes(iv),
      data: aesjs.utils.hex.fromBytes(
        cipher.encrypt(aesjs.utils.utf8.toBytes(value))
      ),
    };
  }

  private decrypt(
    encryptionKey: Uint8Array,
    payload: EncryptedPayload
  ): string | null {
    try {
      const cipher = new aesjs.ModeOfOperation.ctr(
        encryptionKey,
        new aesjs.Counter(aesjs.utils.hex.toBytes(payload.iv))
      );
      const plaintext = aesjs.utils.utf8.fromBytes(
        cipher.decrypt(aesjs.utils.hex.toBytes(payload.data))
      );
      // Supabase only ever stores JSON; anything else is a corrupt payload.
      return parseJson(plaintext).ok ? plaintext : null;
    } catch {
      return null;
    }
  }

  /** The shipped original adapter: per-key AES key in SecureStore, hex payload. */
  private async readLegacyV1(
    key: string,
    storedHex: string
  ): Promise<string | null> {
    const legacyKeyHex = await this.readSecureValue(key);
    if (!legacyKeyHex || !isHex(legacyKeyHex) || !isHex(storedHex)) return null;

    try {
      const cipher = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(legacyKeyHex),
        new aesjs.Counter(1)
      );
      const plaintext = aesjs.utils.utf8.fromBytes(
        cipher.decrypt(aesjs.utils.hex.toBytes(storedHex))
      );
      return parseJson(plaintext).ok ? plaintext : null;
    } catch {
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const parsed = parseJson(stored);
      if (parsed.ok && isEncryptedPayload(parsed.value)) {
        const encryptionKey = await this.getKey(false);
        const plaintext = encryptionKey
          ? this.decrypt(encryptionKey, parsed.value)
          : null;
        if (plaintext === null) {
          reportError("[SessionStore] Stored session is unreadable.");
          await this.removeItem(key).catch(() => {});
        }
        return plaintext;
      }

      if (parsed.ok && isVersionedEnvelope(parsed.value)) {
        reportError("[SessionStore] Malformed session envelope.");
        await this.removeItem(key).catch(() => {});
        return null;
      }

      if (parsed.ok) {
        // Original plaintext adapter. Supabase may persist any JSON value,
        // including string code verifiers, not only session objects.
        await this.migrate(key, stored);
        return stored;
      }

      const legacy = await this.readLegacyV1(key, stored);
      if (legacy === null) {
        reportError("[SessionStore] Legacy v1 session is unreadable.");
        return null;
      }
      await this.migrate(key, legacy);
      return legacy;
    } catch (error) {
      if (error instanceof KeychainUnavailableError) {
        warn(
          "[SessionStore] Keychain remained unavailable after retries:",
          (error as { cause?: unknown }).cause
        );
      } else {
        reportError("[SessionStore] Session storage read failed:", error);
      }
      // Do not translate a temporary read failure into "no session". Supabase
      // callers can retry while the valid encrypted payload remains untouched.
      throw error;
    }
  }

  private async migrate(key: string, plaintext: string): Promise<void> {
    try {
      await this.setItem(key, plaintext);
      await SecureStore.deleteItemAsync(key).catch(() => {});
    } catch {
      // Best effort: continue serving the readable legacy value and retry on
      // a later access rather than forcing the member to sign in again.
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await this.getKey(true);
    if (!encryptionKey) {
      throw new KeychainUnavailableError(null);
    }
    await AsyncStorage.setItem(
      key,
      JSON.stringify(this.encrypt(encryptionKey, value))
    );
  }

  async removeItem(key: string): Promise<void> {
    // The stable key contains no session data and is retained for the next sign-in.
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key).catch(() => {});
  }
}

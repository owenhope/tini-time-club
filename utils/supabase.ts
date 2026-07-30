import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as
  | string
  | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase runtime configuration is missing");
}

if (__DEV__) {
  console.log(`[Supabase] Connected to ${new URL(supabaseUrl).hostname}`);
}

export const supabaseProjectRef = new URL(supabaseUrl).hostname.split(".")[0];

/**
 * Session storage adapter that encrypts values before they touch AsyncStorage.
 *
 * SecureStore (Keychain/Keystore) caps values at ~2KB, which a Supabase session
 * exceeds, so the standard pattern is: a random AES-256 key per storage key
 * lives in SecureStore, and the AES-CTR-encrypted payload lives in AsyncStorage.
 */
class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1)
    );
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(encryptionKey)
    );
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) {
      return null;
    }
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) {
      return null;
    }

    const hasEncryptionKey = await SecureStore.getItemAsync(key);
    if (!hasEncryptionKey) {
      // Migration path: a session persisted by the old plaintext AsyncStorage
      // adapter. Re-store it encrypted and keep the user signed in.
      if (stored.startsWith("{")) {
        await this.setItem(key, stored);
        return stored;
      }
      return null;
    }

    return this.decrypt(key, stored);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

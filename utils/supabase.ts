import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { LargeSecureStore } from "./sessionStorage";
import { log } from "./log";
import { createSessionRetryFetch } from "./sessionRetryFetch";

const expoExtra = Constants.expoConfig?.extra as
  Record<string, unknown> | undefined;
const manifestExtra = Constants.manifest2?.extra as
  | {
      expoClient?: {
        extra?: Record<string, unknown>;
      };
    }
  | undefined;
const manifestExpoExtra = manifestExtra?.expoClient?.extra;
const supabaseUrl =
  (expoExtra?.supabaseUrl as string | undefined) ??
  (manifestExpoExtra?.supabaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  (expoExtra?.supabaseAnonKey as string | undefined) ??
  (manifestExpoExtra?.supabaseAnonKey as string | undefined) ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase runtime configuration is missing");
}

log(`[Supabase] Connected to ${new URL(supabaseUrl).hostname}`);

export const supabaseProjectRef = new URL(supabaseUrl).hostname.split(".")[0];

const serverAuthStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

/**
 * Restore the member's session after a failed token refresh. The auth client
 * caches a refresh failure for a minute and answers every caller from that
 * cache, so a request that just failed as anonymous could not recover until
 * the cooldown passed. Clearing the cached failure lets this one attempt
 * reach the server. `lastRefreshFailure` is internal to auth-js; if a future
 * version renames it this becomes a no-op and recovery waits out the cooldown.
 */
const recoverAccessToken = async (): Promise<string | null> => {
  const auth = supabase.auth as unknown as { lastRefreshFailure?: unknown };
  if ("lastRefreshFailure" in auth) auth.lastRefreshFailure = null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: createSessionRetryFetch({
      anonKey: supabaseAnonKey,
      recoverAccessToken: () => recoverAccessToken(),
    }),
  },
  auth: {
    storage:
      typeof window === "undefined"
        ? serverAuthStorage
        : new LargeSecureStore(),
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

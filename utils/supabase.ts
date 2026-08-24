import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { LargeSecureStore } from "./sessionStorage";
import { log } from "./log";

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

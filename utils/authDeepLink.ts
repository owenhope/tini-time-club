import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { AppState } from "react-native";
import { supabase } from "@/utils/supabase";

const SET_SESSION_ATTEMPTS = 3;
const SET_SESSION_RETRY_DELAY_MS = 500;

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const includeFragmentParams = (url: string) => {
  const fragmentIndex = url.indexOf("#");
  if (fragmentIndex < 0) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url.slice(0, fragmentIndex)}${separator}${url.slice(fragmentIndex + 1)}`;
};

// iOS can deliver an email sign-in link while the app is still in the
// background (the Safari hand-off is on screen) and then cancel the token
// exchange request. Wait for the foreground before each attempt.
const waitForForeground = () =>
  new Promise<void>((resolve) => {
    if (AppState.currentState === "active") {
      resolve();
      return;
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      subscription.remove();
      resolve();
    });
  });

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Creates a persisted Supabase session from a native auth callback URL. */
export const createSessionFromAuthUrl = async (url: string) => {
  const { queryParams } = Linking.parse(includeFragmentParams(url));
  const errorDescription = firstParam(queryParams?.error_description);

  if (errorDescription) {
    throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
  }

  const accessToken = firstParam(queryParams?.access_token);
  const refreshToken = firstParam(queryParams?.refresh_token);
  if (!accessToken || !refreshToken) return null;

  // Retrying a network failure is safe: setSession first validates the
  // access token with a read-only request, and a refresh token that was
  // already consumed fails with a non-retryable error instead.
  for (let attempt = 1; ; attempt += 1) {
    await waitForForeground();
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) return data.session;
    if (!isAuthRetryableFetchError(error) || attempt >= SET_SESSION_ATTEMPTS) {
      throw error;
    }
    await delay(SET_SESSION_RETRY_DELAY_MS * attempt);
  }
};

export const isAuthCallbackUrl = (url: string) => {
  const { hostname, path } = Linking.parse(url);
  return hostname === "auth" || path?.replace(/^\//, "") === "auth/callback";
};

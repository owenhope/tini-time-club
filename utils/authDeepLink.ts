import * as Linking from "expo-linking";
import { supabase } from "@/utils/supabase";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const includeFragmentParams = (url: string) => {
  const fragmentIndex = url.indexOf("#");
  if (fragmentIndex < 0) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url.slice(0, fragmentIndex)}${separator}${url.slice(fragmentIndex + 1)}`;
};

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

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;

  return data.session;
};

export const isAuthCallbackUrl = (url: string) => {
  const { hostname, path } = Linking.parse(url);
  return hostname === "auth" || path?.replace(/^\//, "") === "auth/callback";
};

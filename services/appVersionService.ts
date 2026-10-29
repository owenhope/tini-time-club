import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/utils/supabase";

const APP_STORE_LOOKUP_URL = "https://itunes.apple.com/lookup";
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

type AppStoreLookupResult = {
  version?: unknown;
  trackViewUrl?: unknown;
};

type AppStoreLookupResponse = {
  resultCount?: unknown;
  results?: unknown;
};

export type AppUpdate = {
  installedVersion: string;
  latestVersion: string;
  storeUrl: string;
};

let nextCheckAt = 0;
let cachedUpdate: AppUpdate | null = null;

const numericVersionParts = (version: string) => {
  const core = version.trim().split("-")[0];
  if (!/^\d+(?:\.\d+)*$/.test(core)) return null;
  return core.split(".").map(Number);
};

export const compareAppVersions = (left: string, right: string) => {
  const leftParts = numericVersionParts(left);
  const rightParts = numericVersionParts(right);
  if (!leftParts || !rightParts) return 0;

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
};

const decodeLookupResult = (value: unknown): AppStoreLookupResult | null => {
  if (!value || typeof value !== "object") return null;
  const response = value as AppStoreLookupResponse;
  if (!Array.isArray(response.results) || response.results.length === 0) {
    return null;
  }
  const result = response.results[0];
  return result && typeof result === "object"
    ? (result as AppStoreLookupResult)
    : null;
};

export async function checkForAppStoreUpdate({
  now = Date.now(),
  fetchImpl = fetch,
  platform = Platform.OS,
  installedVersion = Constants.expoConfig?.version,
  bundleIdentifier = Constants.expoConfig?.ios?.bundleIdentifier,
  appEnvironment = Constants.expoConfig?.extra?.environment,
}: {
  now?: number;
  fetchImpl?: typeof fetch;
  platform?: string;
  installedVersion?: string;
  bundleIdentifier?: string;
  appEnvironment?: unknown;
} = {}): Promise<AppUpdate | null> {
  if (platform !== "ios") {
    return null;
  }

  if (!installedVersion || !bundleIdentifier) return null;

  // Preview and development identifiers are not App Store listings.
  if (appEnvironment !== "production") return null;
  if (now < nextCheckAt) return cachedUpdate;

  nextCheckAt = now + RETRY_INTERVAL_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const query = new URLSearchParams({
      bundleId: bundleIdentifier,
      entity: "software",
    });
    const response = await fetchImpl(`${APP_STORE_LOOKUP_URL}?${query}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const result = decodeLookupResult(await response.json());
    // Empty listings are valid; malformed listings should be retried sooner.
    if (result && typeof result.version !== "string") return null;
    nextCheckAt = now + CHECK_INTERVAL_MS;
    cachedUpdate = null;
    if (
      typeof result?.version !== "string" ||
      typeof result.trackViewUrl !== "string" ||
      compareAppVersions(installedVersion, result.version) >= 0
    ) {
      return null;
    }

    cachedUpdate = {
      installedVersion,
      latestVersion: result.version,
      storeUrl: result.trackViewUrl,
    };
    return cachedUpdate;
  } catch {
    // Version discovery must never prevent startup or normal offline use.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export type RequiredUpdate = {
  installedVersion: string;
  minSupportedVersion: string;
  storeUrl: string;
};

type ReleasePolicyRpc = (
  platform: string
) => PromiseLike<{ data: unknown; error: unknown }>;

const fetchReleasePolicy: ReleasePolicyRpc = (platform) =>
  supabase.rpc("get_app_release_policy_v1", { p_platform: platform });

/**
 * The server's minimum supported version for this platform. Returns the
 * update this build must install before it can be used, or null when it is
 * supported. Any failure (offline, bad response, unparsable version) fails
 * open: a minimum version must never lock out a member by accident.
 */
export async function checkMinimumSupportedVersion({
  platform = Platform.OS,
  installedVersion = Constants.expoConfig?.version,
  rpc = fetchReleasePolicy,
}: {
  platform?: string;
  installedVersion?: string;
  rpc?: ReleasePolicyRpc;
} = {}): Promise<RequiredUpdate | null> {
  if ((platform !== "ios" && platform !== "android") || !installedVersion) {
    return null;
  }
  try {
    const { data, error } = await rpc(platform);
    if (error || !data || typeof data !== "object") return null;
    const { minSupportedVersion, storeUrl } = data as Record<string, unknown>;
    if (
      typeof minSupportedVersion !== "string" ||
      typeof storeUrl !== "string" ||
      !storeUrl.startsWith("https://")
    ) {
      return null;
    }
    return compareAppVersions(installedVersion, minSupportedVersion) < 0
      ? { installedVersion, minSupportedVersion, storeUrl }
      : null;
  } catch {
    return null;
  }
}

export const resetAppVersionCheckForTests = () => {
  nextCheckAt = 0;
  cachedUpdate = null;
};

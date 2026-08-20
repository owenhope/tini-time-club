import Constants from "expo-constants";
import { Platform } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { getInstallationId } from "@/services/installationIdentity";
import { supabase } from "@/utils/supabase";
import { warn } from "@/utils/log";

const SESSION_ID = uuidv4();
const RETRY_DELAY_MS = 1_000;

let requestInFlight: Promise<boolean> | null = null;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const heartbeat = async (): Promise<void> => {
  const { error } = await supabase.functions.invoke("app-usage", {
    body: {
      installationId: await getInstallationId(),
      sessionId: SESSION_ID,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? null,
      appEnvironment: Constants.expoConfig?.extra?.environment ?? "production",
    },
  });

  if (error) throw error;
};

/**
 * Records a privacy-safe app heartbeat. The server derives visitor/member
 * status from the request's auth token; the client never asserts its audience.
 * Failure is non-blocking and retried once because the next foreground
 * heartbeat will provide another recovery opportunity.
 */
export const trackAppUsage = async (): Promise<boolean> => {
  if (requestInFlight) return requestInFlight;

  requestInFlight = (async () => {
    try {
      await heartbeat();
      return true;
    } catch (firstError) {
      try {
        await wait(RETRY_DELAY_MS);
        await heartbeat();
        return true;
      } catch (error) {
        warn("[AppUsage] Heartbeat failed:", error, firstError);
        return false;
      }
    }
  })();

  try {
    return await requestInFlight;
  } finally {
    requestInFlight = null;
  }
};

import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/utils/supabase";
import { getNotificationRouteFromData } from "@/utils/notificationRoutes";

const DEFAULT_CHANNEL_ID = "default";
const INSTALLATION_ID_KEY = "push-installation-id";
const UNREGISTRATION_PENDING_KEY = "push-unregistration-pending";
const REGISTRATION_RETRY_DELAY_MS = 60_000;

let clearedDeniedRegistration = false;
let registrationPromise: Promise<string | null> | null = null;
let registrationRetryAfter = 0;
let unregistrationPromise: Promise<boolean> | null = null;

async function getInstallationId(): Promise<string> {
  const storedId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (storedId) return storedId;

  const installationId = uuidv4();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, installationId);
  return installationId;
}

const getProjectId = (): string | null =>
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  null;

const getAppEnvironment = (): string =>
  Constants.expoConfig?.extra?.backendEnvironment ??
  Constants.expoConfig?.extra?.environment ??
  "production";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: "Activity",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#336654",
  });
}

async function getCurrentExpoPushToken(): Promise<string | null> {
  const projectId = getProjectId();
  if (!projectId) {
    console.error("[Push] EAS project ID is missing");
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function performPushRegistration({
  requestPermission = false,
}: {
  requestPermission?: boolean;
} = {}): Promise<string | null> {
  if (
    !Device.isDevice ||
    (Platform.OS !== "ios" && Platform.OS !== "android")
  ) {
    return null;
  }

  try {
    await ensureAndroidChannel();

    let permissions = await Notifications.getPermissionsAsync();
    if (
      !permissions.granted &&
      permissions.status === "undetermined" &&
      requestPermission
    ) {
      permissions = await Notifications.requestPermissionsAsync();
    }

    if (!permissions.granted) {
      if (!clearedDeniedRegistration) {
        await unregisterPushNotificationsAsync();
        clearedDeniedRegistration = true;
      }
      return null;
    }

    const token = await getCurrentExpoPushToken();
    if (!token) return null;

    await retryPendingPushUnregistrationAsync();

    const { error } = await supabase.rpc("register_push_token", {
      p_token: token,
      p_installation_id: await getInstallationId(),
      p_platform: Platform.OS,
      p_app_environment: getAppEnvironment(),
    });

    if (error) throw error;

    clearedDeniedRegistration = false;
    registrationRetryAfter = 0;
    return token;
  } catch (error) {
    registrationRetryAfter = Date.now() + REGISTRATION_RETRY_DELAY_MS;
    console.warn("[Push] Registration failed:", error);
    return null;
  }
}

export async function registerPushNotificationsAsync({
  requestPermission = false,
}: {
  requestPermission?: boolean;
} = {}): Promise<string | null> {
  if (registrationPromise) return registrationPromise;
  if (Date.now() < registrationRetryAfter) return null;

  registrationPromise = performPushRegistration({ requestPermission });
  try {
    return await registrationPromise;
  } finally {
    registrationPromise = null;
  }
}

export async function unregisterPushNotificationsAsync(): Promise<boolean> {
  if (!Device.isDevice) return true;
  if (unregistrationPromise) return unregistrationPromise;

  await SecureStore.setItemAsync(UNREGISTRATION_PENDING_KEY, "true");

  unregistrationPromise = (async () => {
    try {
      const { error } = await supabase.rpc("unregister_push_token", {
        p_installation_id: await getInstallationId(),
      });

      if (error) throw error;
      clearedDeniedRegistration = true;
      await SecureStore.deleteItemAsync(UNREGISTRATION_PENDING_KEY);
      return true;
    } catch (error) {
      console.warn("[Push] Unregistration failed:", error);
      return false;
    } finally {
      unregistrationPromise = null;
    }
  })();

  return unregistrationPromise;
}

export async function retryPendingPushUnregistrationAsync(): Promise<void> {
  if (!Device.isDevice) return;

  const isPending = await SecureStore.getItemAsync(UNREGISTRATION_PENDING_KEY);
  if (isPending) await unregisterPushNotificationsAsync();
}

export function getNotificationRoute(
  response: Notifications.NotificationResponse
): string | null {
  return getNotificationRouteFromData(
    response.notification.request.content.data
  );
}

export function subscribeToPushTokenChanges(
  onTokenChanged: () => void
): Notifications.EventSubscription {
  return Notifications.addPushTokenListener(() => onTokenChanged());
}

export function subscribeToPushRegistrationRetry(retry: () => void): {
  remove: () => void;
} {
  return AppState.addEventListener("change", (state) => {
    if (state === "active") retry();
  });
}

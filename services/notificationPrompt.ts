import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  arePushNotificationsEnabled,
  registerPushNotificationsAsync,
} from "@/services/pushNotificationService";
import { syncFridayMartiniReminder } from "@/utils/martiniReminder";
import { reportError } from "@/utils/log";

/**
 * Asks for notification permission at a moment that explains why, instead of
 * the moment the tabs mount after sign-in. A short in-app explanation comes
 * first; the system dialog only appears if the member taps "Turn on", because
 * iOS lets an app show that dialog once and a reflexive "Don't Allow" is
 * permanent.
 */

const DECLINED_AT_KEY = "notification-prompt:declined-at:v1";
export const RE_ASK_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

let promptOpen = false;

const canAskSystem = async () => {
  if (!arePushNotificationsEnabled()) return false;
  const permissions = await Notifications.getPermissionsAsync();
  return !permissions.granted && permissions.status === "undetermined";
};

const declinedRecently = async (now: number) => {
  try {
    const raw = await AsyncStorage.getItem(DECLINED_AT_KEY);
    const declinedAt = raw ? Number(raw) : NaN;
    return Number.isFinite(declinedAt) && now - declinedAt < RE_ASK_AFTER_MS;
  } catch {
    return false;
  }
};

const enableNotifications = async (fridayReminderEnabled: boolean) => {
  await registerPushNotificationsAsync({ requestPermission: true });
  await syncFridayMartiniReminder(fridayReminderEnabled);
};

/**
 * After a member posts a review: explain notifications and offer to turn them
 * on. Resolves true when the explanation was shown, so callers can avoid
 * stacking another prompt on top of it.
 */
export const offerNotificationsAfterReview = async ({
  fridayReminderEnabled,
  now = Date.now(),
}: {
  fridayReminderEnabled: boolean;
  now?: number;
}): Promise<boolean> => {
  if (promptOpen) return false;
  try {
    if (!(await canAskSystem()) || (await declinedRecently(now))) return false;
  } catch (error) {
    reportError("Could not check notification permission", error);
    return false;
  }

  promptOpen = true;
  Alert.alert(
    "Know when the club reacts",
    "Get a notification when members like, comment on or mention your reviews, plus the Friday Tini Time reminder.",
    [
      {
        text: "Not now",
        style: "cancel",
        onPress: () => {
          promptOpen = false;
          void AsyncStorage.setItem(DECLINED_AT_KEY, String(now)).catch(
            () => {}
          );
        },
      },
      {
        text: "Turn on",
        onPress: () => {
          promptOpen = false;
          void enableNotifications(fridayReminderEnabled).catch((error) =>
            reportError("Could not enable notifications", error)
          );
        },
      },
    ],
    { cancelable: false }
  );
  return true;
};

/**
 * When a member switches a notification preference on in Settings: they have
 * already said yes, so go straight to the system dialog if it hasn't been
 * answered yet.
 */
export const requestNotificationsFromSettings = async (
  fridayReminderEnabled: boolean
): Promise<void> => {
  try {
    if (!(await canAskSystem())) return;
    await enableNotifications(fridayReminderEnabled);
  } catch (error) {
    reportError("Could not enable notifications", error);
  }
};

export const resetNotificationPromptForTests = () => {
  promptOpen = false;
};

import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { reminderForDate, upcomingFridays } from "@/utils/martiniReminders";
import { warn } from "@/utils/log";

/**
 * Friday-evening "tini time" nudges are device-local notifications, not
 * server pushes: local scheduling fires at 5pm in whatever timezone the
 * phone is in, so timezones need no server-side handling at all.
 *
 * Each upcoming Friday is scheduled individually with its own message from
 * the rotating bank (utils/martiniReminders.ts), and the queue is topped up
 * whenever the app runs. iOS caps pending local notifications at 64, so the
 * horizon stays well under that.
 *
 * Scheduled only when notification permission is already granted (the push
 * registration flow owns the permission prompt).
 */

const REMINDER_ID_PREFIX = "tini-friday";
// Earlier id schemes ("friday-martini-reminder" single-repeat, then
// "friday-martini-<date>" at 5pm); cancelled on upgrade so nobody gets
// double or stale-time nudges.
const LEGACY_ID_PREFIX = "friday-martini";
// Opt-out flag from the Notifications screen; ensure() respects it because
// the tab layout re-schedules on every app open.
const REMINDER_DISABLED_KEY = "friday-martini-reminder-disabled";
const REMINDER_HOUR = 16;
const WEEKS_AHEAD = 40;

export async function isFridayMartiniReminderEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(REMINDER_DISABLED_KEY)) !== "true";
  } catch {
    return true;
  }
}

export async function setFridayMartiniReminderEnabled(
  enabled: boolean
): Promise<void> {
  try {
    if (enabled) {
      await SecureStore.deleteItemAsync(REMINDER_DISABLED_KEY);
      await ensureFridayMartiniReminder();
    } else {
      await SecureStore.setItemAsync(REMINDER_DISABLED_KEY, "true");
      await cancelFridayMartiniReminder();
    }
  } catch (error) {
    warn("Failed to update Friday reminder preference:", error);
  }
}

const idForDate = (date: Date) =>
  `${REMINDER_ID_PREFIX}-${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export async function ensureFridayMartiniReminder(): Promise<void> {
  try {
    if (!(await isFridayMartiniReminderEnabled())) return;

    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    await Promise.all(
      scheduled
        .map((n) => n.identifier)
        .filter((id) => id.startsWith(LEGACY_ID_PREFIX))
        .map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );

    const existing = new Set(
      scheduled
        .map((n) => n.identifier)
        .filter((id) => id.startsWith(`${REMINDER_ID_PREFIX}-`))
    );

    const fridays = upcomingFridays(new Date(), WEEKS_AHEAD, REMINDER_HOUR);
    for (const friday of fridays) {
      const identifier = idForDate(friday);
      if (existing.has(identifier)) continue;

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: reminderForDate(friday),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: friday,
        },
      });
    }
  } catch (error) {
    warn("Failed to schedule Friday reminders:", error);
  }
}

export async function cancelFridayMartiniReminder(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .map((n) => n.identifier)
        .filter(
          (id) =>
            id.startsWith(`${REMINDER_ID_PREFIX}-`) ||
            id.startsWith(LEGACY_ID_PREFIX)
        )
        .map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );
  } catch (error) {
    warn("Failed to cancel Friday reminders:", error);
  }
}

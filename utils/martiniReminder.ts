import * as Notifications from "expo-notifications";
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

const REMINDER_ID_PREFIX = "friday-martini";
// Pre-rotation identifier; cancelled on upgrade so nobody gets two nudges.
const LEGACY_REMINDER_ID = "friday-martini-reminder";
const REMINDER_HOUR = 17;
const WEEKS_AHEAD = 40;

const idForDate = (date: Date) =>
  `${REMINDER_ID_PREFIX}-${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export async function ensureFridayMartiniReminder(): Promise<void> {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    if (scheduled.some((n) => n.identifier === LEGACY_REMINDER_ID)) {
      await Notifications.cancelScheduledNotificationAsync(LEGACY_REMINDER_ID);
    }

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
            id === LEGACY_REMINDER_ID
        )
        .map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );
  } catch (error) {
    warn("Failed to cancel Friday reminders:", error);
  }
}

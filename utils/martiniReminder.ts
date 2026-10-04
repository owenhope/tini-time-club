import * as Notifications from "expo-notifications";
import { reminderForDate, upcomingFridays } from "@/utils/martiniReminders";
import { warn } from "@/utils/log";

/**
 * Friday-evening "tini time" nudges are device-local notifications, not
 * server pushes: they fire at 4pm (REMINDER_HOUR) in the phone's timezone,
 * so timezones need no server-side handling at all. DATE triggers are fixed
 * instants, so each request records the instant it was computed for; when the
 * phone's timezone (or the hour) changes, the stale ones are rescheduled.
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
const REMINDER_HOUR = 16;
const WEEKS_AHEAD = 40;

export async function setFridayMartiniReminderEnabled(
  enabled: boolean
): Promise<void> {
  try {
    if (enabled) {
      await ensureFridayMartiniReminder();
    } else {
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

async function ensureFridayMartiniReminder(): Promise<void> {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    await Promise.all(
      scheduled
        .map((n) => n.identifier)
        .filter((id) => id.startsWith(LEGACY_ID_PREFIX))
        .map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );

    // identifier -> the instant it was scheduled for (missing on requests
    // from before the instant was recorded, which then get rescheduled).
    const existing = new Map(
      scheduled
        .filter((n) => n.identifier.startsWith(`${REMINDER_ID_PREFIX}-`))
        .map((n) => [n.identifier, n.content.data?.fireAt as unknown])
    );

    const fridays = upcomingFridays(new Date(), WEEKS_AHEAD, REMINDER_HOUR);
    // A Friday that is no longer upcoming here (e.g. today's, already past
    // 4pm in the new timezone) would otherwise fire at its old instant.
    const expected = new Set(fridays.map(idForDate));
    await Promise.all(
      [...existing.keys()]
        .filter((id) => !expected.has(id))
        .map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );
    for (const friday of fridays) {
      const identifier = idForDate(friday);
      if (existing.has(identifier)) {
        // Same instant: still 4pm local. Otherwise the timezone moved.
        if (existing.get(identifier) === friday.getTime()) continue;
        await Notifications.cancelScheduledNotificationAsync(identifier);
      }

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          ...reminderForDate(friday),
          data: { fireAt: friday.getTime() },
        },
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

export async function syncFridayMartiniReminder(
  enabled: boolean
): Promise<void> {
  if (enabled) {
    await ensureFridayMartiniReminder();
  } else {
    await cancelFridayMartiniReminder();
  }
}

async function cancelFridayMartiniReminder(): Promise<void> {
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

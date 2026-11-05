import * as Notifications from "expo-notifications";
import { upcomingReminders } from "@/utils/martiniReminders";
import { warn } from "@/utils/log";

/**
 * Friday-evening "tini time" nudges are device-local notifications, not
 * server pushes: they fire at 4pm (REMINDER_HOUR) in the phone's timezone,
 * so timezones need no server-side handling at all. DATE triggers are fixed
 * instants, so each request records the instant it was computed for; when the
 * phone's timezone (or the hour) changes, the stale ones are rescheduled.
 *
 * Each upcoming Friday, and each holiday on its own date, is scheduled
 * individually with its own message from the bank (utils/martiniReminders.ts),
 * and the queue is topped up whenever the app runs. iOS caps pending local
 * notifications at 64; 40 weeks of Fridays plus holidays stays under that.
 *
 * Scheduled only when notification permission is already granted (the push
 * registration flow owns the permission prompt).
 */

// Holidays share the "tini-friday" prefix so one id per date covers both and
// requests queued by older builds are still found and replaced.
const REMINDER_ID_PREFIX = "tini-friday";
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

    // identifier -> the request's content, whose data.fireAt is the instant
    // it was scheduled for (missing on requests from before the instant was
    // recorded, which then get rescheduled).
    const existing = new Map(
      scheduled
        .filter((n) => n.identifier.startsWith(`${REMINDER_ID_PREFIX}-`))
        .map((n) => [n.identifier, n.content])
    );

    const reminders = upcomingReminders(new Date(), WEEKS_AHEAD, REMINDER_HOUR);
    // A day that is no longer upcoming here (e.g. today's, already past 4pm
    // in the new timezone) would otherwise fire at its old instant.
    const expected = new Set(reminders.map(({ date }) => idForDate(date)));
    await Promise.all(
      [...existing.keys()]
        .filter((id) => !expected.has(id))
        .map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );
    for (const { date, message } of reminders) {
      const identifier = idForDate(date);
      const current = existing.get(identifier);
      if (current) {
        // Same instant (still 4pm local) and same copy: nothing to do. A
        // moved timezone or an edited message bank reschedules it.
        if (
          current.data?.fireAt === date.getTime() &&
          current.title === message.title &&
          current.body === message.body
        ) {
          continue;
        }
        await Notifications.cancelScheduledNotificationAsync(identifier);
      }

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          ...message,
          data: { fireAt: date.getTime() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
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
        .filter((id) => id.startsWith(`${REMINDER_ID_PREFIX}-`))
        .map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );
  } catch (error) {
    warn("Failed to cancel Friday reminders:", error);
  }
}

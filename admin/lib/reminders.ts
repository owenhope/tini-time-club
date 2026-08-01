// Vendored copy of the app's utils/martiniReminders.ts: Vercel builds only
// upload the admin/ root directory, so a cross-repo import can't resolve
// there. A jest test in the app repo (utils/__tests__/reminderSync.test.ts)
// fails if the two files drift.
export {
  EVERGREEN_REMINDERS,
  SEASONAL_REMINDERS,
  reminderForDate,
  upcomingFridays,
  type ReminderMessage,
} from "./martiniReminders";

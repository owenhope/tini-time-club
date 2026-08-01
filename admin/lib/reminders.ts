// The reminder bank lives with the mobile app; it's a pure TS module (no
// React Native imports), so the admin reuses it directly — one source of
// truth for what each Friday will say.
export {
  EVERGREEN_REMINDERS,
  SEASONAL_REMINDERS,
  reminderForDate,
  upcomingFridays,
  type ReminderMessage,
} from "../../utils/martiniReminders";

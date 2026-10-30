import * as Notifications from "expo-notifications";
import { syncFridayMartiniReminder } from "../martiniReminder";
import { reminderForDate, upcomingFridays } from "../martiniReminders";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  SchedulableTriggerInputTypes: { DATE: "date" },
}));
jest.mock("@/utils/log", () => ({ warn: jest.fn() }));

const idFor = (date: Date) =>
  `tini-friday-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;

beforeEach(() => jest.clearAllMocks());

it("reschedules reminders computed for a different instant (timezone change)", async () => {
  const [first, second] = upcomingFridays(new Date(), 2, 16);
  (
    Notifications.getAllScheduledNotificationsAsync as jest.Mock
  ).mockResolvedValue([
    // Still 4pm local: kept.
    {
      identifier: idFor(first),
      content: { ...reminderForDate(first), data: { fireAt: first.getTime() } },
    },
    // Scheduled for 4pm in another zone: replaced.
    {
      identifier: idFor(second),
      content: {
        ...reminderForDate(second),
        data: { fireAt: second.getTime() + 3 * 3600_000 },
      },
    },
  ]);

  await syncFridayMartiniReminder(true);

  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
    idFor(second)
  );
  expect(
    Notifications.cancelScheduledNotificationAsync
  ).not.toHaveBeenCalledWith(idFor(first));
  const scheduledIds = (
    Notifications.scheduleNotificationAsync as jest.Mock
  ).mock.calls.map(([request]) => request.identifier);
  expect(scheduledIds).toContain(idFor(second));
  expect(scheduledIds).not.toContain(idFor(first));
});

it("reschedules reminders whose copy changed in the message bank", async () => {
  const [first] = upcomingFridays(new Date(), 1, 16);
  (
    Notifications.getAllScheduledNotificationsAsync as jest.Mock
  ).mockResolvedValue([
    {
      identifier: idFor(first),
      content: {
        title: "Old title",
        body: "Old body",
        data: { fireAt: first.getTime() },
      },
    },
  ]);

  await syncFridayMartiniReminder(true);

  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
    idFor(first)
  );
  const request = (
    Notifications.scheduleNotificationAsync as jest.Mock
  ).mock.calls.find(([r]) => r.identifier === idFor(first))?.[0];
  expect(request.content.title).toBe(reminderForDate(first).title);
});

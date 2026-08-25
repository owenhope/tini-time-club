import * as Notifications from "expo-notifications";

/** Keep the iOS app icon aligned with the server's pending Activity count. */
export async function setActivityBadgeCount(count: number): Promise<void> {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  await Notifications.setBadgeCountAsync(safeCount);
}

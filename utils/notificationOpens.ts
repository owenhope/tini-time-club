import type * as Notifications from "expo-notifications";
import { supabase } from "@/utils/supabase";
import { warn } from "@/utils/log";

/**
 * Record that the member opened (tapped) a notification, feeding the
 * admin's open-rate analytics. Best-effort: failures never affect the
 * navigation the tap triggers.
 */
export function logNotificationOpen(
  response: Notifications.NotificationResponse
): void {
  try {
    const request = response.notification.request;
    const data = (request.content.data ?? {}) as Record<string, unknown>;

    // Local Tini Time reminders have no server row; identify them by id.
    const isReminder = request.identifier.startsWith("tini-friday");
    const kind = isReminder
      ? "tini_time_reminder"
      : typeof data.kind === "string"
        ? data.kind
        : null;
    const notificationId =
      typeof data.notificationId === "string" ? data.notificationId : null;

    void supabase
      .rpc("log_notification_open", {
        p_kind: kind,
        p_notification_id: notificationId,
      })
      .then(({ error }) => {
        if (error) warn("Failed to log notification open:", error);
      });
  } catch (error) {
    warn("Failed to log notification open:", error);
  }
}

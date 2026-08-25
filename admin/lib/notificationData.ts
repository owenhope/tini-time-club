import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  resolveNotificationAnalytics,
  type NotificationAnalytics,
} from "@/lib/notificationModels";

export type {
  NotificationAnalytics,
  NotificationKindStats,
} from "@/lib/notificationModels";

const db = supabaseAdmin;

export const fetchNotificationAnalytics = async (
  days = 30
): Promise<NotificationAnalytics> => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await db().rpc("get_admin_notification_analytics", {
    p_since: since.toISOString(),
  });
  if (error) throw toAdminDataError(error, "load notification analytics");
  return resolveNotificationAnalytics(data);
};

export const fetchPushTokenCount = async (): Promise<number> => {
  const { count } = await db()
    .from("push_tokens")
    .select("expo_push_token", { count: "exact", head: true });
  return count ?? 0;
};

export const fetchWeeklyPushSubscriberCount = async (): Promise<number> => {
  const { count, error } = await db()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("deleted", false)
    .eq("weekly_push_notifications_enabled", true);
  if (error) throw toAdminDataError(error, "load notification analytics");

  return count ?? 0;
};

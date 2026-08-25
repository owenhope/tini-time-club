import "server-only";
import { isAnalyticsNotificationKind } from "@/lib/notificationKinds";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface AdminNotification {
  id: string;
  created_at: string;
  body: string;
  kind: string | null;
  /** Username for single-recipient rows; null for grouped broadcasts. */
  username: string | null;
  recipients: number;
  opened: number;
}

export interface NotificationKindStats {
  kind: string;
  sent: number;
  opened: number;
  /** null when sends aren't tracked server-side (local reminders). */
  openRate: number | null;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalOpened: number;
  /** % of opens followed by a review from that member within 24h. */
  openToReviewRate: number | null;
  byKind: NotificationKindStats[];
}

export const NOTIFICATIONS_PAGE_SIZE = 50;

const db = supabaseAdmin;

export const fetchRecentNotifications = async (
  page = 1,
  perPage = NOTIFICATIONS_PAGE_SIZE
): Promise<{ notifications: AdminNotification[]; total: number }> => {
  // notifications.user_id references auth.users, so there's no PostgREST
  // relationship to profiles — resolve usernames in a second query. Admin
  // broadcasts write one row per recipient sharing an
  // `admin:<broadcastId>:<userId>` event_key; collapse those into one entry
  // with recipient/open counts. Pagination happens over the *grouped* list,
  // so fetch a generous window of raw rows and slice after grouping —
  // revisit if raw volume outgrows this.
  const { data, error } = await db()
    .from("notifications")
    .select("id,created_at,body,kind,user_id,event_key")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const userIds = [...new Set((data ?? []).map((n) => n.user_id))];
  const notificationIds = (data ?? []).map((n) => n.id);
  const [{ data: profiles }, { data: opens }] = await Promise.all([
    db().from("profiles").select("id,username").in("id", userIds),
    db()
      .from("notification_opens")
      .select("notification_id")
      .in("notification_id", notificationIds),
  ]);
  const usernames = new Map(
    (profiles ?? []).map((p) => [p.id, p.username as string | null])
  );
  const openedIds = new Set(
    (opens ?? []).map((o) => o.notification_id as string)
  );

  const broadcastKey = (eventKey: string | null): string | null => {
    const match = eventKey?.match(/^admin:([0-9a-f-]{36}):/);
    return match ? match[1] : null;
  };

  const grouped = new Map<string, AdminNotification>();
  for (const n of data ?? []) {
    const key = broadcastKey(n.event_key) ?? n.id;
    const existing = grouped.get(key);
    if (existing) {
      existing.recipients += 1;
      existing.opened += openedIds.has(n.id) ? 1 : 0;
      existing.username = null; // more than one recipient
    } else {
      grouped.set(key, {
        id: key,
        created_at: n.created_at,
        body: n.body,
        kind: n.kind,
        username: usernames.get(n.user_id) ?? null,
        recipients: 1,
        opened: openedIds.has(n.id) ? 1 : 0,
      });
    }
  }
  const all = [...grouped.values()];
  const offset = (Math.max(1, page) - 1) * perPage;
  return {
    notifications: all.slice(offset, offset + perPage),
    total: all.length,
  };
};

export const fetchNotificationAnalytics = async (
  days = 30
): Promise<NotificationAnalytics> => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const [sent, opens, reviews] = await Promise.all([
    db().from("notifications").select("kind").gte("created_at", sinceIso),
    db()
      .from("notification_opens")
      .select("kind,user_id,opened_at")
      .gte("opened_at", sinceIso),
    db()
      .from("reviews")
      .select("user_id,inserted_at")
      .eq("state", 1)
      .gte("inserted_at", sinceIso),
  ]);

  const sentRows = (sent.data ?? []).filter((row) =>
    isAnalyticsNotificationKind(row.kind)
  );
  const openRows = (opens.data ?? []).filter((row) =>
    isAnalyticsNotificationKind(row.kind)
  );

  const sentByKind = new Map<string, number>();
  for (const row of sentRows) {
    const kind = row.kind;
    sentByKind.set(kind, (sentByKind.get(kind) ?? 0) + 1);
  }
  const openedByKind = new Map<string, number>();
  for (const row of openRows) {
    const kind = row.kind;
    openedByKind.set(kind, (openedByKind.get(kind) ?? 0) + 1);
  }

  const kinds = [
    ...new Set([...sentByKind.keys(), ...openedByKind.keys()]),
  ].sort();
  const byKind = kinds
    .map((kind) => {
      const sentCount = sentByKind.get(kind) ?? 0;
      const openedCount = openedByKind.get(kind) ?? 0;
      return {
        kind,
        sent: sentCount,
        opened: openedCount,
        openRate: sentCount > 0 ? openedCount / sentCount : null,
      };
    })
    .sort((left, right) => {
      if (right.sent !== left.sent) return right.sent - left.sent;
      return right.opened - left.opened;
    });

  // Conversion: an open counts if that member posted a review within 24h.
  const dayMs = 24 * 60 * 60 * 1000;
  const reviewsByUser = new Map<string, number[]>();
  for (const review of reviews.data ?? []) {
    const times = reviewsByUser.get(review.user_id) ?? [];
    times.push(new Date(review.inserted_at).getTime());
    reviewsByUser.set(review.user_id, times);
  }
  const converted = openRows.filter((open) => {
    const openedAt = new Date(open.opened_at).getTime();
    return (reviewsByUser.get(open.user_id) ?? []).some(
      (t) => t >= openedAt && t <= openedAt + dayMs
    );
  }).length;

  return {
    totalSent: sentRows.length,
    totalOpened: openRows.length,
    openToReviewRate: openRows.length > 0 ? converted / openRows.length : null,
    byKind,
  };
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
  if (error) throw new Error(error.message);

  return count ?? 0;
};

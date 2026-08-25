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

export interface AdminNotificationRow {
  id: string;
  created_at: string;
  body: string;
  kind: string | null;
  user_id: string;
  event_key: string | null;
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

export interface NotificationSentRow {
  kind: string | null;
}

export interface NotificationOpenRow {
  kind: string | null;
  user_id: string;
  opened_at: string;
}

export interface NotificationReviewRow {
  user_id: string;
  inserted_at: string;
}

const broadcastKey = (eventKey: string | null): string | null => {
  const match = eventKey?.match(/^admin:([0-9a-f-]{36}):/);
  return match ? match[1] : null;
};

export const groupAdminNotifications = (
  rows: AdminNotificationRow[],
  usernames: ReadonlyMap<string, string | null>,
  openedIds: ReadonlySet<string>
): AdminNotification[] => {
  const grouped = new Map<string, AdminNotification>();
  for (const row of rows) {
    const key = broadcastKey(row.event_key) ?? row.id;
    const existing = grouped.get(key);
    if (existing) {
      existing.recipients += 1;
      existing.opened += openedIds.has(row.id) ? 1 : 0;
      existing.username = null;
    } else {
      grouped.set(key, {
        id: key,
        created_at: row.created_at,
        body: row.body,
        kind: row.kind,
        username: usernames.get(row.user_id) ?? null,
        recipients: 1,
        opened: openedIds.has(row.id) ? 1 : 0,
      });
    }
  }
  return [...grouped.values()];
};

export const buildNotificationAnalytics = (
  sentRows: NotificationSentRow[],
  openRows: NotificationOpenRow[],
  reviews: NotificationReviewRow[]
): NotificationAnalytics => {
  const sent = sentRows.filter(
    (row): row is NotificationSentRow & { kind: string } =>
      isAnalyticsNotificationKind(row.kind)
  );
  const opened = openRows.filter(
    (row): row is NotificationOpenRow & { kind: string } =>
      isAnalyticsNotificationKind(row.kind)
  );

  const sentByKind = new Map<string, number>();
  for (const row of sent) {
    sentByKind.set(row.kind, (sentByKind.get(row.kind) ?? 0) + 1);
  }
  const openedByKind = new Map<string, number>();
  for (const row of opened) {
    openedByKind.set(row.kind, (openedByKind.get(row.kind) ?? 0) + 1);
  }

  const kinds = [...new Set([...sentByKind.keys(), ...openedByKind.keys()])].sort();
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
    .sort(
      (left, right) =>
        right.sent - left.sent || right.opened - left.opened
    );

  const reviewsByUser = new Map<string, number[]>();
  for (const review of reviews) {
    const times = reviewsByUser.get(review.user_id) ?? [];
    times.push(new Date(review.inserted_at).getTime());
    reviewsByUser.set(review.user_id, times);
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const converted = opened.filter((open) => {
    const openedAt = new Date(open.opened_at).getTime();
    return (reviewsByUser.get(open.user_id) ?? []).some(
      (time) => time >= openedAt && time <= openedAt + dayMs
    );
  }).length;

  return {
    totalSent: sent.length,
    totalOpened: opened.length,
    openToReviewRate: opened.length > 0 ? converted / opened.length : null,
    byKind,
  };
};
import { isAnalyticsNotificationKind } from "./notificationKinds";

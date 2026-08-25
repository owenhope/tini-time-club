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

export const NOTIFICATION_BATCH_SIZE = 500;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The composer mints a broadcast id when it renders and posts it with the
 * form, so retrying a failed or half-finished send reuses it and the
 * `event_key` upsert skips members who were already notified. Anything that
 * isn't a UUID is rejected rather than trusted as a key.
 */
export const parseBroadcastId = (value: unknown): string | null =>
  typeof value === "string" && UUID_PATTERN.test(value) ? value : null;

export interface AdminNotificationRow {
  user_id: string;
  body: string;
  type: 2;
  kind: "admin_message";
  data: { kind: "admin_message"; url?: string };
  event_key: string;
}

export const buildAdminNotificationRows = (
  userIds: string[],
  input: { body: string; url?: string; broadcastId: string }
): AdminNotificationRow[] =>
  userIds.map((userId) => ({
    user_id: userId,
    body: input.body,
    type: 2,
    kind: "admin_message",
    data: { kind: "admin_message", ...(input.url ? { url: input.url } : {}) },
    event_key: `admin:${input.broadcastId}:${userId}`,
  }));

export const chunkNotificationRows = <T>(
  rows: T[],
  batchSize = NOTIFICATION_BATCH_SIZE
): T[][] => {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Notification batch size must be a positive integer");
  }

  const batches: T[][] = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    batches.push(rows.slice(index, index + batchSize));
  }
  return batches;
};

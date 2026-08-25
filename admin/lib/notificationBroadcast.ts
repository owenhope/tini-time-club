export const NOTIFICATION_BATCH_SIZE = 500;

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

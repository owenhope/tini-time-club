const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  admin_message: "Admin message",
  comment_liked: "Comment like",
  regular_joined: "Became a Regular",
  regular_left: "Lost Regular status",
  review_commented: "Review comment",
  review_created: "New review",
  review_liked: "Review like",
  tini_time_reminder: "Tini Time reminder",
  user_followed: "New follower",
};

const NON_SYSTEM_PUSH_KINDS = new Set(["admin_message", "test_push"]);

const isSystemPushKind = (kind: string) => !NON_SYSTEM_PUSH_KINDS.has(kind);

/** Legacy rows without a typed kind cannot produce meaningful open rates. */
export const isAnalyticsNotificationKind = (
  kind: string | null | undefined
): kind is string =>
  typeof kind === "string" &&
  kind.length > 0 &&
  kind !== "unknown" &&
  isSystemPushKind(kind);

export const formatNotificationSentValue = (kind: string, sent: number) =>
  kind === "tini_time_reminder" ? "On-device" : sent;

export const humanizeNotificationKind = (kind: string) =>
  NOTIFICATION_KIND_LABELS[kind] ??
  kind
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

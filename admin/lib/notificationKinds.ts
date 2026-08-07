const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  admin_message: "Admin message",
  regular_joined: "Became a Regular",
  regular_left: "Lost Regular status",
  review_commented: "Review comment",
  review_created: "New review",
  review_liked: "Review like",
  tini_time_reminder: "Tini Time reminder",
  unknown: "Unknown",
  user_followed: "New follower",
};

const NON_SYSTEM_PUSH_KINDS = new Set(["admin_message", "test_push"]);

export const isSystemPushKind = (kind: string) =>
  !NON_SYSTEM_PUSH_KINDS.has(kind);

export const humanizeNotificationKind = (kind: string) =>
  NOTIFICATION_KIND_LABELS[kind] ??
  kind
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

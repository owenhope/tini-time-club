import type {
  ActivityActor,
  ActivityDisplayRow,
  ActivityEvent,
  ActivityReview,
  ActivitySection,
} from "@/types/activity";
import { getNotificationRouteFromData } from "@/utils/notificationRoutes";

const LIKE_GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

const reviewRoute = (review: ActivityReview, comments: boolean) => {
  const suffix = comments ? "?comments=1" : "";
  return `/r/${encodeURIComponent(review.id)}${suffix}`;
};

const safePreview = (body: string | null) => {
  if (!body) return null;
  return body.replace(/\s+/g, " ").trim();
};

const actorName = (actor: ActivityActor) => actor.username || "Someone";

const routeForEvent = (event: ActivityEvent): string | null => {
  if (event.kind === "user_followed") {
    return getNotificationRouteFromData(event.data);
  }
  if (event.review) {
    return reviewRoute(event.review, event.kind !== "review_liked");
  }
  return event.kind === "admin_message"
    ? getNotificationRouteFromData(event.data)
    : null;
};

const toRow = (
  event: ActivityEvent,
  newIds: ReadonlySet<string>
): ActivityDisplayRow | null => {
  const base = {
    id: event.id,
    notificationIds: [event.id],
    createdAt: event.createdAt,
    isUnread: event.readAt === null,
    isNew: newIds.has(event.id),
    route: routeForEvent(event),
  };

  if (event.kind === "user_followed" && event.actor) {
    return {
      ...base,
      kind: event.kind,
      actor: event.actor,
      isFollowing: event.isFollowing,
    };
  }

  if (event.kind === "review_liked" && event.actor && event.review) {
    return {
      ...base,
      kind: event.kind,
      actor: event.actor,
      actors: [event.actor],
      review: event.review,
      summary: `${actorName(event.actor)} liked your review`,
    };
  }

  if (
    (event.kind === "review_commented" || event.kind === "comment_replied") &&
    event.actor &&
    event.review
  ) {
    return {
      ...base,
      kind: event.kind,
      actor: event.actor,
      review: event.review,
      preview: safePreview(event.comment?.body ?? null),
    };
  }

  if (event.kind === "admin_message") {
    return {
      ...base,
      kind: event.kind,
      body: event.body ?? "You have a new message from Tini Time Club.",
    };
  }

  return null;
};

const canGroupLikes = (left: ActivityDisplayRow, right: ActivityDisplayRow) =>
  left.kind === "review_liked" &&
  right.kind === "review_liked" &&
  left.review.id === right.review.id &&
  Math.abs(
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  ) <= LIKE_GROUP_WINDOW_MS;

const mergeLikeRows = (
  group: Extract<ActivityDisplayRow, { kind: "review_liked" }>,
  next: Extract<ActivityDisplayRow, { kind: "review_liked" }>
): Extract<ActivityDisplayRow, { kind: "review_liked" }> => {
  const actors = [...group.actors, ...next.actors].slice(0, 3);
  const actorCount = group.notificationIds.length + next.notificationIds.length;
  const newestActor = group.actor;
  const summary =
    actorCount === 1
      ? `${actorName(newestActor)} liked your review`
      : `${actorName(newestActor)} and ${actorCount - 1} others liked your review`;

  return {
    ...group,
    notificationIds: [...group.notificationIds, ...next.notificationIds],
    actors,
    summary,
    isUnread: group.isUnread || next.isUnread,
    isNew: group.isNew || next.isNew,
  };
};

export const groupActivityEvents = (
  events: ActivityEvent[],
  newIds: ReadonlySet<string> = new Set()
): ActivityDisplayRow[] => {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      b.id.localeCompare(a.id)
  );
  const rows: ActivityDisplayRow[] = [];

  for (const event of sorted) {
    const row = toRow(event, newIds);
    if (!row) continue;
    const previous = rows[rows.length - 1];
    if (previous && canGroupLikes(previous, row)) {
      rows[rows.length - 1] = mergeLikeRows(
        previous as Extract<ActivityDisplayRow, { kind: "review_liked" }>,
        row as Extract<ActivityDisplayRow, { kind: "review_liked" }>
      );
    } else {
      rows.push(row);
    }
  }
  return rows;
};

export const sectionActivityRows = (
  rows: ActivityDisplayRow[]
): ActivitySection[] => {
  const newer = rows.filter((row) => row.isNew);
  const earlier = rows.filter((row) => !row.isNew);
  return [
    newer.length ? { title: "New" as const, data: newer } : null,
    earlier.length ? { title: "Earlier" as const, data: earlier } : null,
  ].filter((section): section is ActivitySection => section !== null);
};

export const formatActivityKind = (kind: ActivityDisplayRow["kind"]) => {
  switch (kind) {
    case "user_followed":
      return "New follower";
    case "review_liked":
      return "Review like";
    case "review_commented":
      return "Review comment";
    case "comment_replied":
      return "Comment reply";
    case "admin_message":
      return "Tini Time Club";
  }
};

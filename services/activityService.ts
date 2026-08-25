import imageCache from "@/utils/imageCache";
import { supabase } from "@/utils/supabase";
import { isActivityKind } from "@/types/activity";
import type {
  ActivityActor,
  ActivityCursor,
  ActivityEvent,
  ActivityPage,
} from "@/types/activity";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const identifierString = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) return value;
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : null;
};

const numberValue = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const decodeActor = (value: unknown): ActivityActor | null => {
  if (!isRecord(value) || !stringOrNull(value.id)) return null;
  return {
    id: value.id as string,
    username: stringValue(value.username, "Someone"),
    avatarUrl: stringOrNull(value.avatarUrl),
    isVerified: value.isVerified === true,
    reviewCount: numberValue(value.reviewCount),
  };
};

const decodeEvent = (value: unknown): ActivityEvent | null => {
  if (!isRecord(value)) return null;
  const id = stringOrNull(value.id);
  const createdAt = stringOrNull(value.createdAt);
  const kind = stringOrNull(value.kind);
  if (!id || !createdAt || !isActivityKind(kind)) {
    return null;
  }

  const actor = decodeActor(value.actor);
  const reviewValue = isRecord(value.review) ? value.review : null;
  const commentValue = isRecord(value.comment) ? value.comment : null;
  const review =
    reviewValue && identifierString(reviewValue.id)
      ? {
          id: identifierString(reviewValue.id) as string,
          imagePath: stringOrNull(reviewValue.imagePath),
          imageUrl: stringOrNull(reviewValue.imageUrl),
          locationId: identifierString(reviewValue.locationId),
        }
      : null;
  const comment =
    commentValue && identifierString(commentValue.id)
      ? {
          id: identifierString(commentValue.id) as string,
          body: stringOrNull(commentValue.body),
        }
      : null;

  const data = isRecord(value.data) ? value.data : {};
  return {
    id,
    createdAt,
    kind,
    body: stringOrNull(value.body),
    actor,
    isFollowing: value.isFollowing === true,
    review,
    comment,
    data,
    seenAt: stringOrNull(value.seenAt),
    readAt: stringOrNull(value.readAt),
  };
};

const hydrateReviewImages = async (
  events: ActivityEvent[]
): Promise<ActivityEvent[]> => {
  const imagePaths = [
    ...new Set(
      events
        .map((event) => event.review?.imagePath)
        .filter((path): path is string => Boolean(path))
    ),
  ];
  if (!imagePaths.length) return events;
  const imageUrls = await imageCache.getReviewImageUrls(imagePaths);
  return events.map((event) => {
    if (!event.review) return event;
    return {
      ...event,
      review: {
        ...event.review,
        imageUrl:
          event.review.imageUrl ??
          (event.review.imagePath
            ? (imageUrls[event.review.imagePath] ?? null)
            : null),
      },
    };
  });
};

const decodePage = async (value: unknown): Promise<ActivityPage> => {
  const payload = isRecord(value) ? value : {};
  const rawEvents = Array.isArray(payload.events) ? payload.events : [];
  const decodedEvents = rawEvents
    .map(decodeEvent)
    .filter((event): event is ActivityEvent => event !== null);
  const cursorValue = isRecord(payload.nextCursor) ? payload.nextCursor : null;
  const nextCursor: ActivityCursor | null =
    cursorValue &&
    stringOrNull(cursorValue.createdAt) &&
    stringOrNull(cursorValue.id)
      ? {
          createdAt: cursorValue.createdAt as string,
          id: cursorValue.id as string,
        }
      : null;
  const snapshotAt =
    stringOrNull(payload.snapshotAt) ?? new Date().toISOString();
  return {
    events: await hydrateReviewImages(decodedEvents),
    nextCursor,
    hasMore: payload.hasMore === true,
    snapshotAt,
  };
};

export async function fetchActivityPage(
  cursor: ActivityCursor | null = null,
  limit = 30
): Promise<ActivityPage> {
  const { data, error } = await supabase.rpc("get_activity_page", {
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return decodePage(data);
}

export async function fetchUnseenActivityCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_activity_unseen_count");
  if (error) throw error;
  return numberValue(data);
}

export async function markActivitySeenThrough(
  snapshotAt: string
): Promise<void> {
  const { error } = await supabase.rpc("mark_activity_seen_through", {
    p_snapshot_at: snapshotAt,
  });
  if (error) throw error;
}

export async function markActivityRead(
  notificationIds: string[]
): Promise<void> {
  const ids = [...new Set(notificationIds)].slice(0, 50);
  if (!ids.length) return;
  const { error } = await supabase.rpc("mark_activity_read", {
    p_notification_ids: ids,
  });
  if (error) throw error;
}

export function subscribeToActivityChanges(
  userId: string,
  onChange: () => void
): () => void {
  const channel = supabase
    .channel(`activity:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "activity_receipts",
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "activity_withdrawals",
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe((status) => {
      // The initial count query can finish before Realtime is connected. A
      // refresh on SUBSCRIBED closes that race and also re-syncs after an
      // automatic Realtime reconnect.
      if (status === "SUBSCRIBED") onChange();
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

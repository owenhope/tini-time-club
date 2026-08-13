export type ActivityKind =
  | "user_followed"
  | "review_liked"
  | "review_commented"
  | "comment_replied"
  | "admin_message";

export interface ActivityActor {
  id: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  reviewCount: number;
}

export interface ActivityReview {
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  locationId: string | null;
}

export interface ActivityComment {
  id: string;
  body: string | null;
}

export interface ActivityEvent {
  id: string;
  createdAt: string;
  kind: ActivityKind;
  body: string | null;
  actor: ActivityActor | null;
  isFollowing: boolean;
  review: ActivityReview | null;
  comment: ActivityComment | null;
  data: Record<string, unknown>;
  seenAt: string | null;
  readAt: string | null;
}

export interface ActivityCursor {
  createdAt: string;
  id: string;
}

export interface ActivityPage {
  events: ActivityEvent[];
  nextCursor: ActivityCursor | null;
  hasMore: boolean;
  snapshotAt: string;
  cached?: boolean;
}

export interface ActivityDisplayBase {
  id: string;
  notificationIds: string[];
  kind: ActivityKind;
  createdAt: string;
  isUnread: boolean;
  isNew: boolean;
  route: string | null;
}

export interface FollowActivityRow extends ActivityDisplayBase {
  kind: "user_followed";
  actor: ActivityActor;
  isFollowing: boolean;
}

export interface LikeActivityRow extends ActivityDisplayBase {
  kind: "review_liked";
  actor: ActivityActor;
  actors: ActivityActor[];
  review: ActivityReview;
  summary: string;
}

export interface CommentActivityRow extends ActivityDisplayBase {
  kind: "review_commented" | "comment_replied";
  actor: ActivityActor;
  review: ActivityReview;
  preview: string | null;
}

export interface AdminActivityRow extends ActivityDisplayBase {
  kind: "admin_message";
  body: string;
}

export type ActivityDisplayRow =
  FollowActivityRow | LikeActivityRow | CommentActivityRow | AdminActivityRow;

export interface ActivitySection {
  title: "New" | "Earlier";
  data: ActivityDisplayRow[];
}

export interface RawActivityRow {
  id?: unknown;
  createdAt?: unknown;
  kind?: unknown;
  body?: unknown;
  actor?: unknown;
  isFollowing?: unknown;
  review?: unknown;
  comment?: unknown;
  data?: unknown;
  seenAt?: unknown;
  readAt?: unknown;
}

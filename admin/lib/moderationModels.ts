import type { AdminProfile } from "@/lib/profileTypes";

export type ModerationContentType = "review" | "comment";
export type ModerationStatus =
  "pending" | "reviewed" | "resolved" | "dismissed";

export interface ModerationReport {
  id: string;
  created_at: string;
  reason: string;
  status: ModerationStatus;
  content_type: ModerationContentType;
  review_id: number | null;
  comment_id: number | null;
  content_snapshot: Record<string, unknown>;
  reporter: AdminProfile | null;
  creator: AdminProfile | null;
  review: {
    id: number;
    comment: string | null;
    state: number | null;
    location: { name: string | null } | null;
  } | null;
  comment: { id: number; body: string } | null;
}

export interface ModerationReportCounts {
  total: number;
  pending: number;
  reviews: number;
  comments: number;
}

export interface ModerationReportRow {
  id: string;
  created_at: string;
  reason: string;
  status: string | null;
  content_type: string | null;
  review_id: number | null;
  comment_id: number | null;
  reporter_id: string | null;
  creator_id: string | null;
  content_snapshot: unknown;
}

export interface ModerationReviewReference {
  id: number;
  comment: string | null;
  state: number | null;
  location:
    | { name: string | null }
    | { name: string | null }[]
    | null;
}

export interface ModerationCommentReference {
  id: number;
  body: string;
}

const reportSnapshot = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

export const normalizeModerationReports = (
  rows: ModerationReportRow[],
  profiles: ReadonlyMap<string, AdminProfile>,
  reviews: ReadonlyMap<number, ModerationReviewReference>,
  comments: ReadonlyMap<number, ModerationCommentReference>
): ModerationReport[] =>
  rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    reason: row.reason,
    status: (row.status ?? "pending") as ModerationStatus,
    content_type: (row.content_type ??
      (row.comment_id ? "comment" : "review")) as ModerationContentType,
    review_id: row.review_id,
    comment_id: row.comment_id,
    content_snapshot: reportSnapshot(row.content_snapshot),
    reporter: row.reporter_id ? (profiles.get(row.reporter_id) ?? null) : null,
    creator: row.creator_id ? (profiles.get(row.creator_id) ?? null) : null,
    review: row.review_id
      ? (() => {
          const review = reviews.get(row.review_id!);
          return review
            ? { ...review, location: one(review.location) }
            : null;
        })()
      : null,
    comment: row.comment_id ? (comments.get(row.comment_id) ?? null) : null,
  }));

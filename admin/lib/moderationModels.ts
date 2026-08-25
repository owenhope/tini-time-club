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

const numeric = (value: unknown): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const profileFromRpc = (value: unknown): AdminProfile | null => {
  const row = object(value);
  if (Object.keys(row).length === 0) return null;
  return {
    id: String(row.id ?? ""),
    username: (row.username as string | null | undefined) ?? null,
    name: (row.name as string | null | undefined) ?? null,
    avatar_url: (row.avatar_url as string | null | undefined) ?? null,
    is_verified: (row.is_verified as boolean | null | undefined) ?? null,
    deleted: (row.deleted as boolean | null | undefined) ?? null,
    deleted_at: (row.deleted_at as string | null | undefined) ?? null,
    review_count: numeric(row.review_count),
    bio: (row.bio as string | null | undefined) ?? null,
  };
};

export const normalizeModerationReportResponse = (
  value: unknown
): {
  reports: ModerationReport[];
  total: number;
  counts: ModerationReportCounts;
} => {
  const row = object(value);
  const reports = Array.isArray(row.reports) ? row.reports : [];
  const counts = object(row.counts);
  return {
    reports: reports.map((entry) => {
      const report = object(entry);
      const review = object(report.review);
      const comment = object(report.comment);
      const location = object(review.location);
      const contentType =
        report.content_type ??
        (report.comment_id != null ? "comment" : "review");
      return {
        id: String(report.id ?? ""),
        created_at: String(report.created_at ?? ""),
        reason: String(report.reason ?? ""),
        status: (report.status ?? "pending") as ModerationStatus,
        content_type: contentType as ModerationContentType,
        review_id: numeric(report.review_id),
        comment_id: numeric(report.comment_id),
        content_snapshot: reportSnapshot(report.content_snapshot),
        reporter: profileFromRpc(report.reporter),
        creator: profileFromRpc(report.creator),
        review:
          Object.keys(review).length === 0
            ? null
            : {
                id: numeric(review.id) ?? 0,
                comment: (review.comment as string | null | undefined) ?? null,
                state: numeric(review.state),
                location:
                  Object.keys(location).length === 0
                    ? null
                    : { name: (location.name as string | null) ?? null },
              },
        comment:
          Object.keys(comment).length === 0
            ? null
            : {
                id: numeric(comment.id) ?? 0,
                body: String(comment.body ?? ""),
              },
      };
    }),
    total: numeric(row.total) ?? 0,
    counts: {
      total: numeric(counts.total) ?? 0,
      pending: numeric(counts.pending) ?? 0,
      reviews: numeric(counts.reviews) ?? 0,
      comments: numeric(counts.comments) ?? 0,
    },
  };
};

export interface ModerationReviewReference {
  id: number;
  comment: string | null;
  state: number | null;
  location: { name: string | null } | { name: string | null }[] | null;
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
          return review ? { ...review, location: one(review.location) } : null;
        })()
      : null,
    comment: row.comment_id ? (comments.get(row.comment_id) ?? null) : null,
  }));

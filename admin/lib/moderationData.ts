import "server-only";
import type { AdminProfile } from "@/lib/profileTypes";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

const db = supabaseAdmin;

const reportSnapshot = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const fetchModerationReports = async ({
  query,
  status,
  contentType,
  page,
  perPage,
}: {
  query?: string;
  status?: ModerationStatus;
  contentType?: ModerationContentType;
  page: number;
  perPage: number;
}): Promise<{ reports: ModerationReport[]; total: number }> => {
  let request = db()
    .from("reports")
    .select(
      "id,reporter_id,review_id,comment_id,creator_id,reason,created_at,status,content_type,content_snapshot"
    )
    .limit(2000);
  if (status) request = request.eq("status", status);
  if (contentType) request = request.eq("content_type", contentType);

  const { data: reportRows, error } = await request;
  if (error) throw new Error(error.message);

  const rows = reportRows ?? [];
  const profileIds = [
    ...new Set(
      rows
        .flatMap((report) => [report.reporter_id, report.creator_id])
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const reviewIds = [
    ...new Set(
      rows
        .map((report) => report.review_id)
        .filter((id): id is number => id != null)
    ),
  ];
  const commentIds = [
    ...new Set(
      rows
        .map((report) => report.comment_id)
        .filter((id): id is number => id != null)
    ),
  ];

  const [profilesResult, reviewsResult, commentsResult] = await Promise.all([
    profileIds.length > 0
      ? db()
          .from("profiles")
          .select(
            "id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio"
          )
          .in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    reviewIds.length > 0
      ? db()
          .from("reviews")
          .select(
            "id,comment,state,location:locations!reviews_location_fkey(name)"
          )
          .in("id", reviewIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length > 0
      ? db().from("comments").select("id,body").in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (commentsResult.error) throw new Error(commentsResult.error.message);

  const profiles = new Map(
    ((profilesResult.data ?? []) as AdminProfile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );
  const reviews = new Map(
    (reviewsResult.data ?? []).map((review) => [
      review.id,
      {
        id: review.id,
        comment: review.comment,
        state: review.state,
        location: Array.isArray(review.location)
          ? (review.location[0] ?? null)
          : review.location,
      },
    ])
  );
  const comments = new Map(
    (commentsResult.data ?? []).map((comment) => [comment.id, comment])
  );

  const normalized = rows.map((report) => ({
    id: report.id,
    created_at: report.created_at,
    reason: report.reason,
    status: (report.status ?? "pending") as ModerationStatus,
    content_type: (report.content_type ??
      (report.comment_id ? "comment" : "review")) as ModerationContentType,
    review_id: report.review_id,
    comment_id: report.comment_id,
    content_snapshot: reportSnapshot(report.content_snapshot),
    reporter: profiles.get(report.reporter_id) ?? null,
    creator: profiles.get(report.creator_id) ?? null,
    review: report.review_id ? (reviews.get(report.review_id) ?? null) : null,
    comment: report.comment_id
      ? (comments.get(report.comment_id) ?? null)
      : null,
  })) satisfies ModerationReport[];

  const needle = query?.trim().toLowerCase();
  const filtered = needle
    ? normalized.filter((report) => {
        const snapshotText = Object.values(report.content_snapshot)
          .filter((value) => typeof value === "string")
          .join(" ");
        return [
          report.reason,
          report.reporter?.username,
          report.reporter?.name,
          report.creator?.username,
          report.creator?.name,
          report.comment?.body,
          report.review?.comment,
          report.review?.location?.name,
          snapshotText,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
    : normalized;

  filtered.sort((left, right) => {
    const pendingOrder =
      Number(right.status === "pending") - Number(left.status === "pending");
    return (
      pendingOrder ||
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });

  const offset = (Math.max(1, page) - 1) * perPage;
  return {
    reports: filtered.slice(offset, offset + perPage),
    total: filtered.length,
  };
};

export const fetchModerationReportCounts =
  async (): Promise<ModerationReportCounts> => {
    const { data, error } = await db()
      .from("reports")
      .select("status,content_type,comment_id");
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((report) => report.status === "pending").length,
      reviews: rows.filter(
        (report) =>
          (report.content_type ??
            (report.comment_id ? "comment" : "review")) === "review"
      ).length,
      comments: rows.filter(
        (report) =>
          (report.content_type ??
            (report.comment_id ? "comment" : "review")) === "comment"
      ).length,
    };
  };

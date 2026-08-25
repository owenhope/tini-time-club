import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import type { AdminProfile } from "@/lib/profileTypes";
import {
  normalizeModerationReports,
  type ModerationContentType,
  type ModerationReport,
  type ModerationReportCounts,
  type ModerationStatus,
  type ModerationReportRow,
  type ModerationReviewReference,
  type ModerationCommentReference,
} from "@/lib/moderationModels";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type {
  ModerationContentType,
  ModerationReport,
  ModerationReportCounts,
  ModerationStatus,
} from "@/lib/moderationModels";

const db = supabaseAdmin;

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
  if (error) throw toAdminDataError(error, "load moderation reports");

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
  if (profilesResult.error)
    throw toAdminDataError(profilesResult.error, "load report profiles");
  if (reviewsResult.error)
    throw toAdminDataError(reviewsResult.error, "load report reviews");
  if (commentsResult.error)
    throw toAdminDataError(commentsResult.error, "load report comments");

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

  const normalized = normalizeModerationReports(
    rows as ModerationReportRow[],
    profiles,
    reviews as Map<number, ModerationReviewReference>,
    comments as Map<number, ModerationCommentReference>
  );

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
    if (error) throw toAdminDataError(error, "count moderation reports");

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

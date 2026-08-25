import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import {
  normalizeModerationReportResponse,
  type ModerationContentType,
  type ModerationReport,
  type ModerationReportCounts,
  type ModerationStatus,
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
  const { data, error } = await db().rpc("get_admin_moderation_reports", {
    p_query: query ?? null,
    p_status: status ?? null,
    p_content_type: contentType ?? null,
    p_page: page,
    p_per_page: perPage,
  });
  if (error) throw toAdminDataError(error, "load moderation reports");
  const result = normalizeModerationReportResponse(data);
  return {
    reports: result.reports,
    total: result.total,
  };
};

export const fetchModerationReportCounts =
  async (): Promise<ModerationReportCounts> => {
    const [total, pending, reviews, comments] = await Promise.all([
      db().from("reports").select("id", { count: "exact", head: true }),
      db()
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      db()
        .from("reports")
        .select("id", { count: "exact", head: true })
        .or(
          "content_type.eq.review,and(content_type.is.null,comment_id.is.null)"
        ),
      db()
        .from("reports")
        .select("id", { count: "exact", head: true })
        .or(
          "content_type.eq.comment,and(content_type.is.null,comment_id.not.is.null)"
        ),
    ]);
    for (const result of [total, pending, reviews, comments]) {
      if (result.error)
        throw toAdminDataError(result.error, "count moderation reports");
    }
    return {
      total: total.count ?? 0,
      pending: pending.count ?? 0,
      reviews: reviews.count ?? 0,
      comments: comments.count ?? 0,
    };
  };

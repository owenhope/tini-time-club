import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import UserBadge from "@/components/UserBadge";
import {
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  StatusPill,
} from "@/components/AdminPrimitives";
import Pagination from "@/components/Pagination";
import {
  fetchModerationReportCounts,
  fetchModerationReports,
  type ModerationContentType,
  type ModerationStatus,
} from "@/lib/moderationData";
import { parsePagination } from "@/lib/pagination";
import {
  deleteReportedContentAndResolve,
  setReportStatus,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

const shortDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const snapshotString = (
  snapshot: Record<string, unknown>,
  key: string
): string | null => {
  const value = snapshot[key];
  return typeof value === "string" && value.trim() ? value : null;
};

const statusTone = (status: ModerationStatus) => {
  if (status === "pending") return "red" as const;
  if (status === "resolved") return "green" as const;
  if (status === "reviewed") return "purple" as const;
  return "muted" as const;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    per?: string;
    status?: ModerationStatus;
    content?: ModerationContentType;
  }>;
}) {
  const params = await searchParams;
  const { page, perPage } = parsePagination(params);
  const [{ reports, total }, counts] = await Promise.all([
    fetchModerationReports({
      query: params.q,
      status: params.status,
      contentType: params.content,
      page,
      perPage,
    }),
    fetchModerationReportCounts(),
  ]);

  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.content) query.set("content", params.content);

  return (
    <AdminShell active="reports">
      <PageHeader
        eyebrow="Moderation"
        title="Reports"
        description="Review member reports, preserve the original evidence, and moderate comments or reviews."
        stats={[
          { label: "Pending", value: counts.pending, tone: "chartreuse" },
          { label: "All Reports", value: counts.total, tone: "purple" },
          { label: "Review Reports", value: counts.reviews, tone: "green" },
          { label: "Comment Reports", value: counts.comments, tone: "blue" },
        ]}
        surface="transparent"
        density="compact"
      />

      <div className="px-8 py-6">
        <DataTable
          toolbar={
            <FilterBar
              action="/admin/reports"
              searchDefault={params.q}
              searchPlaceholder="Search members, places, or content..."
              variant="attached"
            >
              <FilterSelect
                name="status"
                label="Status"
                defaultValue={params.status}
                options={[
                  { label: "All", value: "" },
                  { label: "Pending", value: "pending" },
                  { label: "Reviewed", value: "reviewed" },
                  { label: "Resolved", value: "resolved" },
                  { label: "Dismissed", value: "dismissed" },
                ]}
              />
              <FilterSelect
                name="content"
                label="Content"
                defaultValue={params.content}
                options={[
                  { label: "All", value: "" },
                  { label: "Reviews", value: "review" },
                  { label: "Comments", value: "comment" },
                ]}
              />
            </FilterBar>
          }
          columns={[
            "Reported",
            "Type",
            "Content & reason",
            "Reported by",
            "Author",
            "Status",
            "Actions",
          ]}
          empty={
            reports.length === 0 ? (
              <EmptyState>No reports match this view.</EmptyState>
            ) : null
          }
        >
          {reports.map((report) => {
            const isComment = report.content_type === "comment";
            const content = isComment
              ? (report.comment?.body ??
                snapshotString(report.content_snapshot, "body") ??
                "Deleted comment")
              : (report.review?.comment ??
                snapshotString(report.content_snapshot, "caption") ??
                "Review without a caption");
            const place =
              report.review?.location?.name ??
              snapshotString(report.content_snapshot, "locationName");
            const targetHref = isComment
              ? report.review_id
                ? `/admin/reviews/${report.review_id}`
                : null
              : report.review_id
                ? `/admin/reviews/${report.review_id}`
                : null;
            const hasLiveContent = isComment
              ? Boolean(report.comment_id && report.comment)
              : Boolean(report.review_id && report.review?.state === 1);

            return (
              <tr key={report.id} className="align-top hover:bg-stone-50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-500">
                  {shortDate(report.created_at)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={isComment ? "purple" : "green"}>
                    {isComment ? "Comment" : "Review"}
                  </StatusPill>
                </td>
                <td className="max-w-md px-4 py-3">
                  {targetHref ? (
                    <Link
                      href={targetHref}
                      className="line-clamp-2 font-semibold text-stone-900 hover:text-violet-700"
                    >
                      {content}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 font-semibold text-stone-900">
                      {content}
                    </p>
                  )}
                  {place ? (
                    <p className="mt-1 truncate text-xs text-stone-400">
                      {place}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-stone-500">
                    Reason: {report.reason}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {report.reporter ? (
                    <Link href={`/admin/users/${report.reporter.id}`}>
                      <UserBadge profile={report.reporter} size="compact" />
                    </Link>
                  ) : (
                    <span className="text-stone-400">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {report.creator ? (
                    <Link href={`/admin/users/${report.creator.id}`}>
                      <UserBadge profile={report.creator} size="compact" />
                    </Link>
                  ) : (
                    <span className="text-stone-400">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={statusTone(report.status)}>
                    {report.status}
                  </StatusPill>
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-36 flex-col gap-2">
                    {report.status !== "reviewed" ? (
                      <form
                        action={setReportStatus.bind(
                          null,
                          report.id,
                          "reviewed"
                        )}
                      >
                        <button className="text-xs font-bold text-violet-700 hover:text-violet-900">
                          Mark Reviewed
                        </button>
                      </form>
                    ) : null}
                    {report.status !== "dismissed" ? (
                      <form
                        action={setReportStatus.bind(
                          null,
                          report.id,
                          "dismissed"
                        )}
                      >
                        <button className="text-xs font-bold text-stone-500 hover:text-stone-900">
                          Dismiss
                        </button>
                      </form>
                    ) : null}
                    {hasLiveContent ? (
                      <form
                        action={deleteReportedContentAndResolve.bind(
                          null,
                          report.id
                        )}
                      >
                        <button className="text-left text-xs font-bold text-red-600 hover:text-red-800">
                          Delete {isComment ? "Comment" : "Review"} & Resolve
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>

        <Pagination
          path="/admin/reports"
          baseQuery={query.toString()}
          pageParam="page"
          perParam="per"
          page={page}
          perPage={perPage}
          total={total}
          noun="reports"
        />
      </div>
    </AdminShell>
  );
}

import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import UserBadge from "@/components/UserBadge";
import {
  ActionLink,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  StatusPill,
} from "@/components/AdminPrimitives";
import Pagination, { parsePerPage } from "@/components/Pagination";
import { fetchAllReviews, fetchReviewCounts } from "@/lib/data";

export const dynamic = "force-dynamic";

const overall = (taste: number | null, presentation: number | null) =>
  taste == null || presentation == null
    ? "—"
    : (Math.round(((taste + presentation) / 2) * 10) / 10).toFixed(1);

const shortDate = (value: string) => new Date(value).toLocaleDateString();

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    per?: string;
    state?: "active" | "inactive";
  }>;
}) {
  const { q, page: pageParam, per: perParam, state } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = parsePerPage(perParam);
  const [{ reviews, total }, counts] = await Promise.all([
    fetchAllReviews(q, page, perPage, state),
    fetchReviewCounts(),
  ]);

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (state) query.set("state", state);

  return (
    <AdminShell active="reviews">
      <PageHeader
        eyebrow="Core workspace"
        title="Reviews"
        description="Scan review content by author, place, rating, state, and caption."
        stats={[
          {
            label: "Total Reviews",
            value: counts.total.toLocaleString(),
            tone: "purple",
          },
          {
            label: "Active Reviews",
            value: counts.active.toLocaleString(),
            tone: "green",
          },
          {
            label: "Inactive Reviews",
            value: counts.inactive.toLocaleString(),
            tone: "muted",
          },
        ]}
        statColumns={3}
        surface="transparent"
        density="compact"
        filters={
          <FilterBar
            action="/admin/reviews"
            searchDefault={q}
            searchPlaceholder="Search captions..."
          >
            <FilterSelect
              name="state"
              label="State"
              defaultValue={state}
              options={[
                { label: "All", value: "" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
          </FilterBar>
        }
      />

      <div className="px-8 py-6">
        <DataTable
          columns={[
            "Posted",
            "Member",
            "Place",
            "Rating",
            "Caption",
            "State",
            "Actions",
          ]}
          empty={
            reviews.length === 0 ? (
              <EmptyState>
                {q ? `No reviews match "${q}".` : "No reviews match this view."}
              </EmptyState>
            ) : null
          }
        >
          {reviews.map((review) => (
            <tr key={review.id} className="hover:bg-stone-50">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-500">
                {shortDate(review.inserted_at)}
              </td>
              <td className="px-4 py-3">
                {review.profile ? (
                  <Link
                    href={`/admin/users/${review.profile.id}`}
                    className="block min-w-0 hover:opacity-80"
                  >
                    <UserBadge profile={review.profile} />
                  </Link>
                ) : (
                  <span className="text-stone-400">—</span>
                )}
              </td>
              <td className="max-w-52 truncate px-4 py-3 font-bold text-stone-900">
                {review.location?.name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="font-mono text-base font-semibold tabular-nums text-stone-900">
                  {overall(review.taste, review.presentation)}
                </span>
                <span className="ml-2 text-xs text-stone-400">
                  T {review.taste ?? "—"} / P {review.presentation ?? "—"}
                </span>
              </td>
              <td className="max-w-96 truncate px-4 py-3 text-stone-500">
                {review.comment ?? ""}
              </td>
              <td className="px-4 py-3">
                {review.state === 1 ? (
                  <StatusPill tone="green">Active</StatusPill>
                ) : (
                  <StatusPill>Inactive</StatusPill>
                )}
              </td>
              <td className="px-4 py-3">
                <ActionLink href={`/admin/reviews/${review.id}`}>
                  Manage
                </ActionLink>
              </td>
            </tr>
          ))}
        </DataTable>

        <Pagination
          path="/admin/reviews"
          baseQuery={query.toString()}
          pageParam="page"
          perParam="per"
          page={page}
          perPage={perPage}
          total={total}
          noun="reviews"
        />
      </div>
    </AdminShell>
  );
}

import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Pagination, { parsePerPage } from "@/components/Pagination";
import { fetchAllReviews } from "@/lib/data";

export const dynamic = "force-dynamic";

const overall = (taste: number | null, presentation: number | null) =>
  taste == null || presentation == null
    ? "—"
    : (Math.round(((taste + presentation) / 2) * 10) / 10).toFixed(1);

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; per?: string }>;
}) {
  const { q, page: pageParam, per: perParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = parsePerPage(perParam);
  const { reviews, total } = await fetchAllReviews(q, page, perPage);

  return (
    <AdminShell active="reviews">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight">Reviews</h1>
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search comments…"
            className="w-64 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Search
          </button>
        </form>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-5 py-3">Posted</th>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Rating</th>
              <th className="px-5 py-3">Comment</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {reviews.map((review) => (
              <tr key={review.id} className="hover:bg-stone-50">
                <td className="whitespace-nowrap px-5 py-3 text-stone-500">
                  {new Date(review.inserted_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  {review.profile ? (
                    <Link
                      href={`/admin/users/${review.profile.id}`}
                      className="font-medium text-violet-600 hover:text-violet-800"
                    >
                      @{review.profile.username ?? "unknown"}
                    </Link>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                <td className="max-w-48 truncate px-5 py-3">
                  {review.location?.name ?? "—"}
                  {review.state !== 1 ? (
                    <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
                      Inactive
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span className="font-semibold tabular-nums">
                    {overall(review.taste, review.presentation)}
                  </span>{" "}
                  <span className="text-xs text-stone-400">
                    T {review.taste ?? "—"} · P {review.presentation ?? "—"}
                  </span>
                </td>
                <td className="max-w-64 truncate px-5 py-3 text-stone-500">
                  {review.comment ?? ""}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/r/${encodeURIComponent(review.id)}`}
                    target="_blank"
                    className="font-medium text-violet-600 hover:text-violet-800"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-stone-400">
                  {q ? <>No reviews match “{q}”.</> : "No reviews yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          path="/admin/reviews"
          baseQuery={q ? `q=${encodeURIComponent(q)}` : ""}
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

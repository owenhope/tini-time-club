import AdminShell from "@/components/AdminShell";
import Pagination, { parsePerPage } from "@/components/Pagination";
import { fetchLocations } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; per?: string }>;
}) {
  const { q, page: pageParam, per: perParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = parsePerPage(perParam);
  const { locations, total } = await fetchLocations(q, page, perPage);

  return (
    <AdminShell active="locations">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight">Locations</h1>
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search locations…"
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
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Address</th>
              <th className="px-5 py-3">Rating</th>
              <th className="px-5 py-3">Reviews</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {locations.map((location) => (
              <tr key={location.id} className="hover:bg-stone-50">
                <td className="px-5 py-3 font-medium">
                  {location.name ?? "—"}
                </td>
                <td className="max-w-96 truncate px-5 py-3 text-stone-500">
                  {location.address ?? "—"}
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {location.rating != null && location.total_ratings > 0
                    ? Number(location.rating).toFixed(1)
                    : "—"}
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {location.total_ratings}
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-stone-400">
                  {q ? <>No locations match “{q}”.</> : "No locations yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          path="/admin/locations"
          baseQuery={q ? `q=${encodeURIComponent(q)}` : ""}
          pageParam="page"
          perParam="per"
          page={page}
          perPage={perPage}
          total={total}
          noun="locations"
        />
      </div>
    </AdminShell>
  );
}

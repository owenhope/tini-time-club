import AdminShell from "@/components/AdminShell";
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
import { fetchLocationCounts, fetchLocations } from "@/lib/data";
import { formatCityRegion } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    per?: string;
    minReviews?: string;
  }>;
}) {
  const {
    q,
    page: pageParam,
    per: perParam,
    minReviews: minReviewsParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = parsePerPage(perParam);
  const minReviews = Math.max(0, Number(minReviewsParam) || 0);
  const [{ locations, total }, counts] = await Promise.all([
    fetchLocations(q, page, perPage, minReviews),
    fetchLocationCounts(),
  ]);

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (minReviewsParam) query.set("minReviews", minReviewsParam);

  return (
    <AdminShell active="locations">
      <PageHeader
        eyebrow="Core workspace"
        title="Locations"
        description="Inspect place quality, rating volume, address coverage, and review activity."
        stats={[
          {
            label: "Total Locations",
            value: counts.total.toLocaleString(),
            tone: "chartreuse",
          },
          {
            label: "Rated Locations",
            value: counts.rated.toLocaleString(),
            tone: "green",
          },
          {
            label: "5+ Review Locations",
            value: counts.strong.toLocaleString(),
            tone: "purple",
          },
        ]}
        statColumns={3}
        surface="transparent"
        density="compact"
        filters={
          <FilterBar
            action="/admin/locations"
            searchDefault={q}
            searchPlaceholder="Search locations..."
          >
            <FilterSelect
              name="minReviews"
              label="Activity"
              defaultValue={minReviewsParam}
              options={[
                { label: "All", value: "" },
                { label: "1+ reviews", value: "1" },
                { label: "5+ reviews", value: "5" },
                { label: "10+ reviews", value: "10" },
              ]}
            />
          </FilterBar>
        }
      />

      <div className="px-8 py-6">
        <DataTable
          columns={[
            "Place",
            "Area",
            "Address",
            "Rating",
            "Reviews",
            "Status",
            "Actions",
          ]}
          empty={
            locations.length === 0 ? (
              <EmptyState>
                {q
                  ? `No locations match "${q}".`
                  : "No locations match this view."}
              </EmptyState>
            ) : null
          }
        >
          {locations.map((location) => (
            <tr key={location.id} className="hover:bg-stone-50">
              <td className="px-4 py-3 font-bold text-stone-900">
                {location.name ?? "—"}
              </td>
              <td className="max-w-48 truncate px-4 py-3 text-stone-500">
                {formatCityRegion(location.address) || "—"}
              </td>
              <td className="max-w-96 truncate px-4 py-3 text-stone-500">
                {location.address ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-base font-semibold tabular-nums text-stone-900">
                  {location.rating != null && location.total_ratings > 0
                    ? Number(location.rating).toFixed(1)
                    : "—"}
                </span>
              </td>
              <td className="px-4 py-3 font-mono tabular-nums text-stone-700">
                {location.total_ratings}
              </td>
              <td className="px-4 py-3">
                {location.total_ratings >= 5 ? (
                  <StatusPill tone="green">Active</StatusPill>
                ) : location.total_ratings > 0 ? (
                  <StatusPill tone="purple">Warming</StatusPill>
                ) : (
                  <StatusPill>Unrated</StatusPill>
                )}
              </td>
              <td className="px-4 py-3">
                <ActionLink href={`/admin/locations/${location.id}`}>
                  Manage
                </ActionLink>
              </td>
            </tr>
          ))}
        </DataTable>

        <Pagination
          path="/admin/locations"
          baseQuery={query.toString()}
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

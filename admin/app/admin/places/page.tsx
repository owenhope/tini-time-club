import AdminShell from "@/components/AdminShell";
import ClickableRow from "@/components/ClickableRow";
import {
  ActionLink,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
} from "@/components/AdminPrimitives";
import Pagination, { parsePerPage } from "@/components/Pagination";
import { fetchLocationCounts, fetchLocations } from "@/lib/data";
import type { LocationSort } from "@/lib/data";
import { formatCityRegion } from "@/lib/format";

export const dynamic = "force-dynamic";

const parseLocationSort = (value?: string): LocationSort =>
  value === "area" || value === "rating" || value === "reviews"
    ? value
    : "place";

const SortHeader = ({
  label,
  field,
  sort,
  baseQuery,
  defaultMarker,
}: {
  label: string;
  field: LocationSort;
  sort: LocationSort;
  baseQuery: URLSearchParams;
  defaultMarker: "↑" | "↓";
}) => {
  const active = sort === field;
  const query = new URLSearchParams(baseQuery);
  if (field === "place") {
    query.delete("sort");
  } else {
    query.set("sort", field);
  }
  const href = query.size > 0 ? `/admin/places?${query}` : "/admin/places";

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1 transition hover:text-violet-700 ${
        active ? "text-stone-900" : ""
      }`}
    >
      {label}
      <span className="font-mono text-[10px] text-stone-400">
        {active ? defaultMarker : "↕"}
      </span>
    </a>
  );
};

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    per?: string;
    minReviews?: string;
    sort?: string;
  }>;
}) {
  const {
    q,
    page: pageParam,
    per: perParam,
    minReviews: minReviewsParam,
    sort: sortParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = parsePerPage(perParam);
  const minReviews = Math.max(0, Number(minReviewsParam) || 0);
  const sort = parseLocationSort(sortParam);
  const [{ locations, total }, counts] = await Promise.all([
    fetchLocations(q, page, perPage, minReviews, sort),
    fetchLocationCounts(),
  ]);

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (minReviewsParam) query.set("minReviews", minReviewsParam);
  if (sort !== "place") query.set("sort", sort);

  const headerQuery = new URLSearchParams(query);
  if (perParam) headerQuery.set("per", String(perPage));
  headerQuery.delete("page");

  return (
    <AdminShell active="locations">
      <PageHeader
        eyebrow="Core workspace"
        title="Places"
        description="Inspect place quality, rating volume, address coverage, and review activity."
        stats={[
          {
            label: "Total Places",
            value: counts.total.toLocaleString(),
            tone: "chartreuse",
          },
          {
            label: "Rated Places",
            value: counts.rated.toLocaleString(),
            tone: "green",
          },
          {
            label: "5+ Review Places",
            value: counts.strong.toLocaleString(),
            tone: "purple",
          },
        ]}
        statColumns={3}
        surface="transparent"
        density="compact"
      />

      <div className="px-8 py-6">
        <DataTable
          toolbar={
            <FilterBar
              action="/admin/places"
              searchDefault={q}
              searchPlaceholder="Search places..."
              variant="attached"
            >
              {sort !== "place" ? (
                <input type="hidden" name="sort" value={sort} />
              ) : null}
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
          columns={[
            <SortHeader
              key="place"
              label="Place"
              field="place"
              sort={sort}
              baseQuery={headerQuery}
              defaultMarker="↑"
            />,
            <SortHeader
              key="area"
              label="Area"
              field="area"
              sort={sort}
              baseQuery={headerQuery}
              defaultMarker="↑"
            />,
            "Address",
            <SortHeader
              key="rating"
              label="Rating"
              field="rating"
              sort={sort}
              baseQuery={headerQuery}
              defaultMarker="↓"
            />,
            <SortHeader
              key="reviews"
              label="Reviews"
              field="reviews"
              sort={sort}
              baseQuery={headerQuery}
              defaultMarker="↓"
            />,
            "Actions",
          ]}
          empty={
            locations.length === 0 ? (
              <EmptyState>
                {q ? `No places match "${q}".` : "No places match this view."}
              </EmptyState>
            ) : null
          }
        >
          {locations.map((location) => (
            <ClickableRow
              key={location.id}
              href={`/admin/places/${location.id}`}
              className="cursor-pointer hover:bg-stone-50 focus:bg-stone-50 focus:outline-none"
            >
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
                <ActionLink href={`/admin/places/${location.id}`}>
                  Manage
                </ActionLink>
              </td>
            </ClickableRow>
          ))}
        </DataTable>

        <Pagination
          path="/admin/places"
          baseQuery={query.toString()}
          pageParam="page"
          perParam="per"
          page={page}
          perPage={perPage}
          total={total}
          noun="places"
        />
      </div>
    </AdminShell>
  );
}

import AdminShell from "@/components/AdminShell";
import {
  ActionLink,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
} from "@/components/AdminPrimitives";
import Pagination, { parsePerPage } from "@/components/Pagination";
import UserBadge, { tierFor } from "@/components/UserBadge";
import {
  fetchProfileCounts,
  fetchProfiles,
  type ProfileSort,
  type SortDirection,
} from "@/lib/data";

export const dynamic = "force-dynamic";

const date = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : "—";

const SORTS = [
  "username",
  "rank",
  "review_count",
  "created_at",
  "last_review_at",
] as const;
const DIRECTIONS = ["asc", "desc"] as const;
type VisibleProfileSort = (typeof SORTS)[number];

const parseSort = (value?: string): ProfileSort =>
  SORTS.includes(value as VisibleProfileSort)
    ? (value as ProfileSort)
    : "review_count";

const parseDirection = (value?: string): SortDirection =>
  DIRECTIONS.includes(value as SortDirection)
    ? (value as SortDirection)
    : "desc";

const SortHeader = ({
  label,
  field,
  sort,
  direction,
  baseQuery,
  defaultDirection = "asc",
}: {
  label: string;
  field: ProfileSort;
  sort: ProfileSort;
  direction: SortDirection;
  baseQuery: URLSearchParams;
  defaultDirection?: SortDirection;
}) => {
  const active = sort === field;
  const nextDirection: SortDirection = active
    ? direction === "asc"
      ? "desc"
      : "asc"
    : defaultDirection;
  const query = new URLSearchParams(baseQuery);
  query.set("sort", field);
  query.set("dir", nextDirection);
  const marker = active ? (direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <a
      href={`/admin/users?${query.toString()}`}
      className={`inline-flex items-center gap-1 transition hover:text-violet-700 ${
        active ? "text-stone-900" : ""
      }`}
    >
      {label}
      <span className="font-mono text-[10px] text-stone-400">{marker}</span>
    </a>
  );
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    per?: string;
    status?: "active" | "deleted" | "verified";
    sort?: string;
    dir?: string;
  }>;
}) {
  const {
    q,
    page: pageParam,
    per: perParam,
    status,
    sort: sortParam,
    dir,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = parsePerPage(perParam);
  const sort = parseSort(sortParam);
  const direction = parseDirection(dir);
  const [{ profiles, total }, counts] = await Promise.all([
    fetchProfiles(q, page, perPage, status, sort, direction),
    fetchProfileCounts(),
  ]);

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (sort !== "review_count") query.set("sort", sort);
  if (direction !== "desc") query.set("dir", direction);

  const headerQuery = new URLSearchParams(query);
  if (perParam) headerQuery.set("per", String(perPage));

  return (
    <AdminShell active="users">
      <PageHeader
        eyebrow="Core workspace"
        title="Members"
        description="Scan members by status, rank, signup recency, and review activity."
        stats={[
          {
            label: "Total Members",
            value: counts.total.toLocaleString(),
            tone: "green",
          },
          {
            label: "Verified Members",
            value: counts.verified.toLocaleString(),
            tone: "purple",
          },
          {
            label: "Deleted Members",
            value: counts.deleted.toLocaleString(),
            tone: "muted",
          },
        ]}
        statColumns={3}
        surface="transparent"
        density="compact"
        filters={
          <FilterBar
            action="/admin/users"
            searchDefault={q}
            searchPlaceholder="Search members..."
          >
            {sort !== "review_count" ? (
              <input type="hidden" name="sort" value={sort} />
            ) : null}
            {direction !== "desc" ? (
              <input type="hidden" name="dir" value={direction} />
            ) : null}
            <FilterSelect
              name="status"
              label="Status"
              defaultValue={status}
              options={[
                { label: "All", value: "" },
                { label: "Active", value: "active" },
                { label: "Verified", value: "verified" },
                { label: "Deleted", value: "deleted" },
              ]}
            />
          </FilterBar>
        }
      />

      <div className="px-8 py-6">
        <DataTable
          columns={[
            <SortHeader
              key="member"
              label="Member"
              field="username"
              sort={sort}
              direction={direction}
              baseQuery={headerQuery}
            />,
            <SortHeader
              key="rank"
              label="Rank"
              field="rank"
              sort={sort}
              direction={direction}
              baseQuery={headerQuery}
              defaultDirection="desc"
            />,
            <SortHeader
              key="reviews"
              label="Reviews"
              field="review_count"
              sort={sort}
              direction={direction}
              baseQuery={headerQuery}
              defaultDirection="desc"
            />,
            <SortHeader
              key="joined"
              label="Joined"
              field="created_at"
              sort={sort}
              direction={direction}
              baseQuery={headerQuery}
              defaultDirection="desc"
            />,
            <SortHeader
              key="last-review"
              label="Last review"
              field="last_review_at"
              sort={sort}
              direction={direction}
              baseQuery={headerQuery}
              defaultDirection="desc"
            />,
            "Actions",
          ]}
          empty={
            profiles.length === 0 ? (
              <EmptyState>
                {q ? `No members match "${q}".` : "No members match this view."}
              </EmptyState>
            ) : null
          }
        >
          {profiles.map((profile) => {
            const tier = tierFor(profile.review_count);
            return (
              <tr key={profile.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <UserBadge profile={profile} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-stone-900">{tier.name}</span>
                </td>
                <td className="px-4 py-3 font-mono font-semibold tabular-nums text-stone-700">
                  {(profile.review_count ?? 0).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-stone-500">
                  {date(profile.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-stone-500">
                  {date(profile.last_review_at)}
                </td>
                <td className="px-4 py-3">
                  <ActionLink href={`/admin/users/${profile.id}`}>
                    Manage
                  </ActionLink>
                </td>
              </tr>
            );
          })}
        </DataTable>

        <Pagination
          path="/admin/users"
          baseQuery={query.toString()}
          pageParam="page"
          perParam="per"
          page={page}
          perPage={perPage}
          total={total}
          noun="members"
        />
      </div>
    </AdminShell>
  );
}

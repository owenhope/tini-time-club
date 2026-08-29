import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import ClickableRow from "@/components/ClickableRow";
import {
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  PageHeader,
  StatusPill,
} from "@/components/AdminPrimitives";
import Pagination from "@/components/Pagination";
import { fetchLocationClaims } from "@/lib/claimData";
import {
  formatLocationClaimStatus,
  type LocationClaimStatus,
} from "@/lib/claimTypes";
import { parsePagination } from "@/lib/pagination";
import { formatAdminDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const statuses: LocationClaimStatus[] = [
  "pending",
  "approved",
  "rejected",
  "superseded",
];

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    per?: string;
  }>;
}) {
  const query = await searchParams;
  const { page, perPage } = parsePagination({
    page: query.page,
    per: query.per,
  });
  const status = statuses.includes(query.status as LocationClaimStatus)
    ? (query.status as LocationClaimStatus)
    : undefined;
  const result = await fetchLocationClaims(status, query.q, page, perPage);
  const baseQuery = new URLSearchParams();
  if (query.q) baseQuery.set("q", query.q);
  if (status) baseQuery.set("status", status);

  return (
    <AdminShell active="claims">
      <PageHeader
        eyebrow="Business verification"
        title="Claims"
        description="Review member requests to verify existing places. Approval never grants manager access."
        stats={[
          {
            label: "Pending claims",
            value: result.pendingCount,
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
              action="/admin/claims"
              searchDefault={query.q}
              searchPlaceholder="Search claims..."
              variant="attached"
            >
              <FilterSelect
                name="status"
                label="Status"
                defaultValue={query.status}
                options={[
                  { label: "All", value: "" },
                  ...statuses.map((value) => ({
                    label: value[0].toUpperCase() + value.slice(1),
                    value,
                  })),
                ]}
              />
            </FilterBar>
          }
          columns={[
            "Place",
            "Member",
            "Business role",
            "Submitted",
            "Status",
            "Actions",
          ]}
          empty={
            result.claims.length === 0 ? (
              <EmptyState>No claims match this view.</EmptyState>
            ) : null
          }
        >
          {result.claims.map((claim) => (
            <ClickableRow
              key={claim.id}
              href={`/admin/claims/${claim.id}`}
              className="cursor-pointer hover:bg-stone-50 focus:bg-stone-50 focus:outline-none"
            >
              <td className="px-4 py-3">
                <div className="font-bold text-stone-900">
                  {claim.location_name ?? "—"}
                </div>
                <div className="max-w-64 truncate text-xs text-stone-500">
                  {claim.location_address ?? ""}
                </div>
              </td>
              <td className="px-4 py-3 text-stone-700">
                {claim.profile_name ??
                  claim.contact_name ??
                  claim.username ??
                  "Redacted"}
              </td>
              <td className="px-4 py-3 text-stone-700">
                {claim.business_role}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-500">
                {formatAdminDate(claim.submitted_at)}
              </td>
              <td className="px-4 py-3">
                <StatusPill
                  tone={
                    claim.status === "approved"
                      ? "green"
                      : claim.status === "pending"
                        ? "purple"
                        : undefined
                  }
                >
                  {formatLocationClaimStatus(claim.status)}
                </StatusPill>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/claims/${claim.id}`}
                  className="text-sm font-bold text-violet-700"
                >
                  Review
                </Link>
              </td>
            </ClickableRow>
          ))}
        </DataTable>
        <Pagination
          path="/admin/claims"
          baseQuery={baseQuery.toString()}
          pageParam="page"
          perParam="per"
          page={page}
          perPage={perPage}
          total={result.total}
          noun="claims"
        />
      </div>
    </AdminShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import {
  ActionLink,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/AdminPrimitives";
import { fetchAdminRegions, fetchGoldenGlassInspection } from "@/lib/data";
import RegionMapEditor from "../../../regions/RegionMapEditor";

export const dynamic = "force-dynamic";

export default async function ManageRegionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    updated?: string;
    error?: string;
    refresh?: string;
  }>;
}) {
  const [{ id }, query, regions] = await Promise.all([
    params,
    searchParams,
    fetchAdminRegions(),
  ]);
  const region = regions.find((candidate) => String(candidate.id) === id);
  if (!region) notFound();
  const recipients = (await fetchGoldenGlassInspection(id)).filter(
    (row) => row.is_current
  );
  const returnTo = "/admin/places/golden-glass/regions/" + region.id;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <AdminShell active="golden-glass">
      <PageHeader
        backLink={{
          href: "/admin/places/golden-glass",
          label: "Back to Golden Glass",
        }}
        eyebrow="Explore authority"
        title={"Manage " + region.name}
        description="Control availability, ordering, automatic catchment matching, and Golden Glass recipients for this region."
        actions={
          <Link
            href="/admin/places/golden-glass"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Golden Glass index
          </Link>
        }
        surface="transparent"
        density="compact"
      />
      <div className="space-y-5 px-8 py-6">
        {query.updated ? (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950 ring-1 ring-inset ring-emerald-200">
            Region settings updated.
          </div>
        ) : null}
        {query.refresh === "failed" ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950 ring-1 ring-inset ring-amber-200">
            Region saved, but Golden Glass could not refresh. Use Refresh
            snapshot from the Golden Glass index.
          </div>
        ) : null}
        {query.error ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 ring-1 ring-inset ring-red-100">
            Check the region fields and try again.
          </div>
        ) : null}
        <RegionMapEditor region={region} returnTo={returnTo} apiKey={apiKey} />
        <Panel
          title={
            region.name + " · " + recipients.length + " Golden Glass recipients"
          }
          href={"/admin/places/golden-glass?region=" + region.id}
          linkLabel="Open index"
        >
          <DataTable
            columns={[
              "Place",
              "Rank",
              "Overall",
              "Reviewers",
              "Latest review",
              "Actions",
            ]}
            empty={
              recipients.length === 0 ? (
                <EmptyState>
                  No Golden Glass recipients in this region yet.
                </EmptyState>
              ) : null
            }
          >
            {recipients.map((recipient) => (
              <tr
                key={recipient.region_id + "-" + recipient.location_id}
                className="bg-amber-50/50"
              >
                <td className="px-4 py-3 font-bold text-stone-900">
                  {recipient.venue_name ?? "Place #" + recipient.location_id}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-stone-700">
                  {recipient.calculated_rank}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-stone-800">
                  {recipient.raw_overall.toFixed(1)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-stone-700">
                  {recipient.distinct_reviewers}
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {new Date(recipient.latest_review_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <ActionLink href={"/admin/places/" + recipient.location_id}>
                    View place
                  </ActionLink>
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </AdminShell>
  );
}

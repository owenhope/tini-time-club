import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { PageHeader } from "@/components/AdminPrimitives";
import { refreshGoldenGlass } from "@/lib/actions";
import { fetchAdminRegions, fetchGoldenGlassInspection } from "@/lib/placeData";
import GoldenGlassRegionsTable from "./GoldenGlassRegionsTable";

export const dynamic = "force-dynamic";

export default async function GoldenGlassPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; refreshed?: string }>;
}) {
  const query = await searchParams;
  const [regions, rows] = await Promise.all([
    fetchAdminRegions(),
    fetchGoldenGlassInspection(query.region),
  ]);
  const groups = regions.map((region) => ({
    region,
    recipients: rows.filter(
      (row) => row.region_id === region.id && row.is_current
    ),
  }));

  return (
    <AdminShell active="golden-glass">
      <PageHeader
        backLink={{ href: "/admin/places", label: "Back to places" }}
        eyebrow="Recognition inspection"
        title="Golden Glass"
        description="Manage regions and review the current Golden Glass recipients for each one. Click a region to expand its recipients."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <form action={refreshGoldenGlass}>
              <button
                type="submit"
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Refresh snapshot
              </button>
            </form>
            <Link
              href="/admin/places/golden-glass/regions/new"
              className="rounded-lg bg-emerald-900 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Create region
            </Link>
          </div>
        }
        surface="transparent"
        density="compact"
      />
      <div className="space-y-5 px-8 py-6">
        {query.refreshed ? (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950 ring-1 ring-inset ring-emerald-200">
            Current snapshot refreshed.
          </div>
        ) : null}
        <GoldenGlassRegionsTable groups={groups} />
      </div>
    </AdminShell>
  );
}

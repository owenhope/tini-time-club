import AdminShell from "@/components/AdminShell";
import { DataTable, EmptyState } from "@/components/AdminPrimitives";
import AnalyticsHeader from "@/components/AnalyticsHeader";
import DonutChart from "@/components/DonutChart";
import FeatureSection from "@/components/FeatureSection";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import { fetchAnalyticsOverview } from "@/lib/analytics/overview";
import { fetchDeviceUsage } from "@/lib/platformData";
import { platformLabel } from "@/lib/platformMix.mjs";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const [analytics, devices] = await Promise.all([
    fetchAnalyticsOverview(range),
    fetchDeviceUsage(range),
  ]);
  const memberPlatformTotal =
    devices.members.ios + devices.members.android + devices.members.other;
  const memberPlatformRows = (
    [
      ["ios", "iOS", devices.members.ios],
      ["android", "Android", devices.members.android],
      ["other", "Other", devices.members.other],
    ] as const
  )
    .filter(([, , count]) => count > 0)
    .map(([key, label, count]) => ({
      key,
      label,
      count,
      share: memberPlatformTotal > 0 ? count / memberPlatformTotal : 0,
    }));
  return (
    <AdminShell active="analytics">
      <AnalyticsHeader
        active="overview"
        range={range}
        title="Analytics overview"
        description="The club's essential growth and activity signals. Open a focused screen when you need the detail behind a trend."
      />
      <main className="space-y-8 px-8 pb-32 pt-6">
        <FeatureSection
          id="headlines"
          title="Club growth"
          description="All-time size and what was added during the selected period."
        >
          <div className="grid grid-cols-12 gap-4">
            <MetricTile
              label="Total members"
              value={analytics.totals.members}
              hint={`${analytics.current.members.toLocaleString()} new this period`}
              className="col-span-12 md:col-span-4"
            />
            <MetricTile
              label="Total reviews"
              value={analytics.totals.reviews}
              hint={`${analytics.current.reviews.toLocaleString()} posted this period`}
              className="col-span-12 border-chartreuse-dark bg-chartreuse/20 md:col-span-4"
            />
            <MetricTile
              label="Total places"
              value={analytics.totals.places}
              hint={`${analytics.current.places.toLocaleString()} added this period`}
              className="col-span-12 border-violet-300 bg-violet-50 md:col-span-4"
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <LineChart
              title="New members"
              data={analytics.membersByDay}
              color="#059669"
              unit="members"
            />
            <LineChart
              title="Reviews"
              data={analytics.reviewsByDay}
              color="#b9cf1f"
              unit="reviews"
            />
            <LineChart
              title="New places"
              data={analytics.placesByDay}
              color="#7c3aed"
              unit="places"
            />
          </div>
        </FeatureSection>
        <FeatureSection
          id="activity"
          title="Member activity"
          description="A compact pulse check across the app's highest-value social actions."
        >
          <div className="grid grid-cols-12 gap-4">
            <MetricTile
              label="Follows"
              value={analytics.current.follows}
              previous={analytics.previous.follows}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Review likes"
              value={analytics.current.likes}
              previous={analytics.previous.likes}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Comments"
              value={analytics.current.comments}
              previous={analytics.previous.comments}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Review shares"
              value={analytics.current.shares}
              previous={analytics.previous.shares}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
          </div>
          <MetricTile
            label="Martini Index interactions"
            value={analytics.current.indexInteractions}
            previous={analytics.previous.indexInteractions}
            hint="views, filters, and generated Martinis"
          />
        </FeatureSection>
        <FeatureSection
          id="devices"
          title="Devices"
          description="Who opened the app on iOS or Android during the selected period. A member on both counts once on each."
        >
          <div className="grid grid-cols-12 gap-4">
            <MetricTile
              label="iOS members"
              value={devices.members.ios}
              hint="signed-in accounts"
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Android members"
              value={devices.members.android}
              hint="signed-in accounts"
              className="col-span-12 border-chartreuse-dark bg-chartreuse/20 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="iOS anonymous"
              value={devices.visitors.ios}
              hint="signed-out installations"
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Android anonymous"
              value={devices.visitors.android}
              hint="signed-out installations"
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <DonutChart
              title="Members by platform"
              rows={memberPlatformRows}
              total={memberPlatformTotal}
              unit="members"
            />
            <DataTable
              columns={["Platform", "App version", "Installations"]}
              empty={
                devices.versions.length === 0 ? (
                  <EmptyState>No app opens in this period.</EmptyState>
                ) : null
              }
            >
              {devices.versions.map((version) => (
                <tr key={`${version.platform}:${version.version}`}>
                  <td className="px-4 py-3 font-bold text-stone-900">
                    {platformLabel(version.platform)}
                  </td>
                  <td className="px-4 py-3 font-mono text-stone-700">
                    {version.version}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-stone-700">
                    {version.installations.toLocaleString()}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        </FeatureSection>
      </main>
    </AdminShell>
  );
}

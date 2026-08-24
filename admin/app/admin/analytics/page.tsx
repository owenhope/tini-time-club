import AdminShell from "@/components/AdminShell";
import AnalyticsHeader from "@/components/AnalyticsHeader";
import FeatureSection from "@/components/FeatureSection";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import { fetchAnalyticsOverview } from "@/lib/analytics/overview";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const analytics = await fetchAnalyticsOverview(range);
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
      </main>
    </AdminShell>
  );
}

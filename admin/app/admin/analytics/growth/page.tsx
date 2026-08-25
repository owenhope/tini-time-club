import AdminShell from "@/components/AdminShell";
import AnalyticsHeader from "@/components/AnalyticsHeader";
import FeatureSection, { BreakdownList } from "@/components/FeatureSection";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import { fetchGrowthAnalytics } from "@/lib/analytics/growth";
import { fetchProductTelemetry } from "@/lib/analyticsData";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";
const pct = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : "—";

export default async function GrowthAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const [growth, telemetry] = await Promise.all([
    fetchGrowthAnalytics(range),
    fetchProductTelemetry(range),
  ]);
  const firstToSecond = pct(
    growth.membersWithSecondReview,
    growth.membersWithFirstReview
  );
  return (
    <AdminShell active="analytics">
      <AnalyticsHeader
        active="growth"
        range={range}
        title="Growth"
        description="Acquisition, onboarding, review activation, retention, and app-version adoption."
      />
      <main className="space-y-8 px-8 pb-32 pt-6">
        <FeatureSection
          id="onboarding"
          title="Onboarding funnel"
          description="How far members make it from account creation through setup and into the review loop."
          link={{ href: "/admin/users", label: "All members" }}
        >
          <div className="grid grid-cols-12 gap-4">
            <MetricTile
              label="New signups"
              value={growth.signupsInRange}
              previous={growth.previousSignups}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Completed onboarding"
              value={growth.onboardingCompletedInRange}
              hint={`${pct(growth.onboardingCompletedTotal, growth.totalMembers)} of all members are complete`}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Reached first review"
              value={growth.membersWithFirstReview}
              hint={`${pct(growth.membersWithFirstReview, growth.onboardingCompletedTotal)} of completed members`}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Reached second review"
              value={growth.membersWithSecondReview}
              hint={`${firstToSecond} of first reviewers`}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
          </div>
          <LineChart
            title="Signups"
            data={growth.signupsByDay}
            color="#059669"
            unit="signups"
          />
        </FeatureSection>
        <FeatureSection
          id="reviews"
          title="Review activation"
          description="Who enters the core loop, who returns for a second review, and how quickly."
          link={{ href: "/admin/reviews", label: "All reviews" }}
        >
          <div className="grid grid-cols-12 gap-4">
            <MetricTile
              label="Reviews posted"
              value={growth.reviewsInRange}
              previous={growth.previousReviews}
              className="col-span-12 md:col-span-4"
            />
            <MetricTile
              label="Distinct reviewers"
              value={growth.reviewedInRange}
              className="col-span-12 md:col-span-4"
            />
            <MetricTile
              label="Reviews per reviewer"
              value={
                growth.reviewedInRange > 0
                  ? (growth.reviewsInRange / growth.reviewedInRange).toFixed(1)
                  : "—"
              }
              className="col-span-12 md:col-span-4"
            />
            <MetricTile
              label="First reviews"
              value={growth.firstReviewsInRange}
              className="col-span-12 md:col-span-3"
            />
            <MetricTile
              label="Second reviews"
              value={growth.secondReviewsInRange}
              className="col-span-12 md:col-span-3"
            />
            <MetricTile
              label="First → second"
              value={firstToSecond}
              className="col-span-12 md:col-span-3"
            />
            <MetricTile
              label="Time to first review"
              value={
                growth.averageDaysToFirstReview == null
                  ? "—"
                  : `${growth.averageDaysToFirstReview.toFixed(1)}d`
              }
              hint="average from account creation"
              className="col-span-12 md:col-span-3"
            />
          </div>
          <LineChart
            title="Reviews"
            data={growth.reviewsByDay}
            color="#b9cf1f"
            unit="reviews"
          />
        </FeatureSection>
        <FeatureSection
          id="retention"
          title="Seven-day return"
          description="Installations first seen in the range that opened the app again exactly seven days later."
        >
          {telemetry.available ? (
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="Eligible installations"
                value={telemetry.retention.eligibleInstallations}
                className="col-span-12 md:col-span-4"
              />
              <MetricTile
                label="Returned on day 7"
                value={telemetry.retention.returnedInstallations}
                className="col-span-12 md:col-span-4"
              />
              <MetricTile
                label="D7 retention"
                value={
                  telemetry.retention.rate == null
                    ? "Collecting…"
                    : `${telemetry.retention.rate}%`
                }
                hint="requires seven full days of production presence data"
                className="col-span-12 md:col-span-4"
              />
            </div>
          ) : (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Product telemetry is not enabled in this environment yet.
            </p>
          )}
        </FeatureSection>
        <FeatureSection
          id="versions"
          title="App-version adoption"
          description="The latest version seen for each distinct installation during the range."
        >
          {telemetry.available ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_2fr]">
              <MetricTile
                label="Tracked installations"
                value={telemetry.trackedInstallations}
              />
              <BreakdownList
                title="Version mix"
                rows={telemetry.versions.map((version) => ({
                  key: version.version,
                  label: version.version,
                  value: `${version.installations.toLocaleString()} · ${version.share}%`,
                }))}
                empty="No app versions have reported in this range."
              />
            </div>
          ) : (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Version adoption will appear after product telemetry is deployed.
            </p>
          )}
        </FeatureSection>
      </main>
    </AdminShell>
  );
}

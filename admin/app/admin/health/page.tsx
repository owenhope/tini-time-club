import AdminShell from "@/components/AdminShell";
import ApplicationHealthSummary from "@/components/ApplicationHealthSummary";
import KpiCard from "@/components/KpiCard";
import MetricTile from "@/components/MetricTile";
import RangePicker from "@/components/RangePicker";
import { PageHeader, Panel } from "@/components/AdminPrimitives";
import {
  fetchDashboardKpis,
  fetchModerationReportCounts,
  fetchProductTelemetry,
} from "@/lib/data";
import { buildApplicationHealth } from "@/lib/applicationHealth.mjs";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const [kpis, telemetry, reportCounts] = await Promise.all([
    fetchDashboardKpis(range),
    fetchProductTelemetry(range),
    fetchModerationReportCounts(),
  ]);
  const health = buildApplicationHealth({
    kpis,
    telemetry,
    pendingReports: reportCounts.pending,
    rangeLabel: range.label,
  });
  const authEvents = telemetry.available
    ? telemetry.authHealth.unexpectedSignOuts +
      telemetry.authHealth.sessionMissingAtLaunch
    : null;

  return (
    <AdminShell active="health">
      <PageHeader
        eyebrow="Operations"
        title="Health"
        description="A detailed read on growth, reliability, retention, and moderation—what is improving, what is slipping, and where an operator should look next."
        actions={<RangePicker path="/admin/health" range={range} />}
        stats={[
          { label: "Window", value: range.label, tone: "muted" },
          {
            label: "Pending reports",
            value: reportCounts.pending,
            tone: reportCounts.pending > 0 ? "chartreuse" : "green",
          },
          {
            label: "Auth-health events",
            value: authEvents ?? "Not reporting",
            tone: authEvents && authEvents > 0 ? "chartreuse" : "green",
          },
          {
            label: "D7 retention",
            value:
              telemetry.available && telemetry.retention.rate != null
                ? `${telemetry.retention.rate}%`
                : "Collecting",
            tone: "purple",
          },
        ]}
        surface="transparent"
        density="compact"
      />

      <div className="space-y-5 px-8 pb-24 pt-2">
        <ApplicationHealthSummary health={health} />

        <section className="grid grid-cols-12 gap-4">
          <KpiCard
            label="New members"
            metric={kpis.users}
            newLabel="members"
            href="/admin/users"
            color="#336654"
            rangeLabel={range.label}
            className="col-span-12 xl:col-span-4"
          />
          <KpiCard
            label="New reviews"
            metric={kpis.reviews}
            newLabel="reviews"
            href="/admin/reviews"
            color="#D6E640"
            rangeLabel={range.label}
            className="col-span-12 xl:col-span-4"
          />
          <KpiCard
            label="New places"
            metric={kpis.locations}
            newLabel="places"
            href="/admin/places"
            color="#6B53A8"
            rangeLabel={range.label}
            className="col-span-12 xl:col-span-4"
          />
        </section>

        <Panel
          title="Authentication & retention"
          href={`/admin/analytics?${range.query}#auth-health`}
          linkLabel="Detailed analytics"
        >
          {telemetry.available ? (
            <div className="grid grid-cols-12 gap-3 p-4">
              <MetricTile
                label="Unexpected sign-outs"
                value={telemetry.authHealth.unexpectedSignOuts}
                hint="session ended while the app was running"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Missing at launch"
                value={telemetry.authHealth.sessionMissingAtLaunch}
                hint="signed in last run, absent on next launch"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Affected installations"
                value={telemetry.authHealth.affectedInstallations}
                hint={
                  telemetry.authHealth.issueRate == null
                    ? "rate unavailable"
                    : `${telemetry.authHealth.issueRate}% of tracked installations`
                }
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="D7 retention"
                value={
                  telemetry.retention.rate == null
                    ? "Collecting…"
                    : `${telemetry.retention.rate}%`
                }
                hint={`${telemetry.retention.returnedInstallations} of ${telemetry.retention.eligibleInstallations} eligible installations returned`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
            </div>
          ) : (
            <p className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Product telemetry is not deployed in this environment yet. The
              growth and moderation sections remain authoritative.
            </p>
          )}
        </Panel>

        <Panel
          title="Moderation"
          href="/admin/reports"
          linkLabel="Review reports"
        >
          <div className="grid grid-cols-12 gap-3 p-4">
            <MetricTile
              label="Pending"
              value={reportCounts.pending}
              hint="waiting for an operator decision"
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="All reports"
              value={reportCounts.total}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Review reports"
              value={reportCounts.reviews}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Comment reports"
              value={reportCounts.comments}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
          </div>
        </Panel>

        <Panel title="How to read Health">
          <dl className="grid gap-4 p-4 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="font-bold text-stone-800">Wins and losses</dt>
              <dd className="mt-1 leading-6 text-stone-500">
                The selected range is compared with the immediately preceding
                range of exactly the same length.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-stone-800">What to watch</dt>
              <dd className="mt-1 leading-6 text-stone-500">
                Flat growth, pending moderation, auth trouble, and incomplete
                retention data appear here without being hidden in a score.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-stone-800">Authentication</dt>
              <dd className="mt-1 leading-6 text-stone-500">
                Intentional logout is excluded. Only unexpected sign-outs and
                sessions missing after a previous signed-in run are counted.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-stone-800">D7 retention</dt>
              <dd className="mt-1 leading-6 text-stone-500">
                An installation qualifies when it is first seen in the range and
                opens the app again exactly seven days later.
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </AdminShell>
  );
}

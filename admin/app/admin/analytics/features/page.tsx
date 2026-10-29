import Form from "next/form";
import AdminSubmitButton from "@/components/AdminSubmitButton";
import AdminShell from "@/components/AdminShell";
import AnalyticsHeader from "@/components/AnalyticsHeader";
import { DataTable, EmptyState } from "@/components/AdminPrimitives";
import FeatureSection from "@/components/FeatureSection";
import { fetchFeatureUsage } from "@/lib/analytics/featureUsage";
import {
  featureUsageFilters,
  rankFeatureUsage,
} from "@/lib/analytics/featureUsageModel.mjs";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function FeatureUsagePage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    from?: string;
    to?: string;
    surface?: string;
    environment?: string;
    kind?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const range = parseRange(params);
  const filters = featureUsageFilters(params);
  const data = await fetchFeatureUsage(
    range,
    filters.surface,
    filters.environment
  );
  const rows = data ? rankFeatureUsage(data, filters) : [];
  const isApp = filters.surface === "app";
  const selectClass =
    "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900";
  return (
    <AdminShell active="analytics">
      <AnalyticsHeader
        active="features"
        range={range}
        title="Feature usage"
        description="See which screens and actions get used, ranked by reach or frequency."
        extraQuery={new URLSearchParams(filters).toString()}
      />
      <main key={JSON.stringify(filters)} className="space-y-6 px-8 pb-32 pt-6">
        <Form className="flex flex-wrap items-end gap-4" action="">
          {Array.from(new URLSearchParams(range.query)).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label className="flex flex-col gap-1 text-sm font-bold">
            Surface
            <select
              name="surface"
              defaultValue={filters.surface}
              className={selectClass}
            >
              <option value="app">Member app</option>
              <option value="admin">Admin panel</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Environment
            <select
              name="environment"
              defaultValue={filters.environment}
              className={selectClass}
            >
              <option value="production">Production</option>
              <option value="preview">Preview</option>
              <option value="development">Development</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Measure
            <select
              name="kind"
              defaultValue={filters.kind}
              className={selectClass}
            >
              <option value="screen">Screen visits</option>
              <option value="action">Actions</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Rank by
            <select
              name="sort"
              defaultValue={filters.sort}
              className={selectClass}
            >
              <option value="reach">Unique reach</option>
              <option value="events">Event count</option>
              <option value="installations">Installations (app)</option>
            </select>
          </label>
          <AdminSubmitButton
            pendingLabel="Applying…"
            className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-bold text-white"
            type="submit"
          >
            Apply
          </AdminSubmitButton>
        </Form>
        <FeatureSection
          id="ranking"
          title={`${isApp ? "App" : "Admin"} feature ranking`}
          description={
            isApp
              ? "Unique members are signed-in accounts. Installations include visitors and members; they are not people and must not be added to member counts."
              : "Reach means distinct signed-in admin sessions, not people. The shared admin login cannot identify individual operators."
          }
        >
          {data === null ? (
            <EmptyState>
              Feature usage is not available on this backend yet. Deploy the
              feature usage migration to enable the ranking.
            </EmptyState>
          ) : (
            <>
              {rows.every((row) => row.events === 0) && (
                <EmptyState>
                  No recorded events for these filters. New tracking starts with
                  the updated app and admin deployment; earlier usage cannot be
                  reconstructed.
                </EmptyState>
              )}
              <DataTable
                columns={[
                  "Rank",
                  "Feature",
                  isApp ? "Members" : "Signed-in sessions",
                  ...(isApp ? ["Installations"] : []),
                  "Events",
                  "Last recorded (UTC)",
                ]}
              >
                {rows.map((row, index) => (
                  <tr key={row.event}>
                    <td className="px-4 py-3 font-mono text-stone-500">
                      {row.events ? index + 1 : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-900">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {(isApp ? row.members : row.sessions).toLocaleString()}
                    </td>
                    {isApp && (
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {row.installations.toLocaleString()}
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {row.events.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500">
                      {row.lastUsed
                        ? new Date(row.lastUsed)
                            .toISOString()
                            .replace("T", " ")
                            .slice(0, 16)
                        : "No recorded usage"}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </>
          )}
        </FeatureSection>
        <p className="max-w-4xl text-sm leading-6 text-stone-500">
          Dates use UTC. A visit is a navigation into a screen, not a render,
          refresh of its data, or time spent there. Screens and subviews are
          listed separately and must not be summed. Actions count recorded
          interactions; share attempts do not confirm delivery. Zero means no
          recorded usage, not proof a feature was unused. Older app versions
          lack the new events. Production excludes development, preview and
          unlabelled events. Historical Index/share tables are excluded because
          they lack environment labels.
        </p>
      </main>
    </AdminShell>
  );
}

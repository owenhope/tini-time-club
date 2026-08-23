import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import LiveRefresh from "@/components/LiveRefresh";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusPill,
} from "@/components/AdminPrimitives";
import { fetchAudienceUsage, fetchLiveActivity } from "@/lib/data";
import { formatRelativeDate } from "@/lib/format";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const platformLabel = (platform: string) =>
  platform === "ios"
    ? "iOS"
    : platform === "android"
      ? "Android"
      : platform === "web"
        ? "Web"
        : "Unknown";

export default async function LivePage() {
  const liveRange = parseRange({ days: "7" });
  const [audience, activity] = await Promise.all([
    fetchAudienceUsage(liveRange),
    fetchLiveActivity(),
  ]);

  return (
    <AdminShell active="live">
      <PageHeader
        eyebrow="Operations"
        title="Live"
        description="See who is active and what is happening across the app. This page refreshes every 10 seconds while the tab is visible."
        actions={<LiveRefresh />}
        surface="transparent"
        density="compact"
      />

      <div className="space-y-5 px-8 pb-24 pt-2">
        <Panel title="App audience">
          {audience.available ? (
            <>
              <div className="border-b border-stone-100 px-4 py-3 text-xs text-stone-500">
                Active now means a heartbeat in the last 15 minutes. Anonymous
                visitors are counted as installations, never inferred people.
              </div>
              <div className="grid grid-cols-12 gap-3 p-4">
                <MetricTile
                  label="Anonymous active now"
                  value={audience.visitorActiveNow}
                  hint="unauthenticated installations"
                  className="col-span-12 md:col-span-6 xl:col-span-3"
                />
                <MetricTile
                  label="Members active now"
                  value={audience.memberActiveNow}
                  hint="authenticated accounts"
                  className="col-span-12 md:col-span-6 xl:col-span-3"
                />
                <MetricTile
                  label="Anonymous this week"
                  value={audience.visitorInRange}
                  hint="distinct installations"
                  className="col-span-12 md:col-span-6 xl:col-span-3"
                />
                <MetricTile
                  label="Visitor → member"
                  value={audience.convertedInRange}
                  hint="installations seen before and after sign-in"
                  className="col-span-12 md:col-span-6 xl:col-span-3"
                />
              </div>
              <div className="grid gap-4 border-t border-stone-100 p-4 xl:grid-cols-2">
                <LineChart
                  title="Anonymous installations · 7 days"
                  data={audience.visitorByDay}
                  color="#6B53A8"
                  unit="installations"
                />
                <LineChart
                  title="Authenticated members · 7 days"
                  data={audience.memberByDay}
                  color="#336654"
                  unit="members"
                />
              </div>
            </>
          ) : (
            <p className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              App audience tracking is not enabled in this environment yet.
            </p>
          )}
        </Panel>

        <Panel title="Recent app actions">
          <div className="border-b border-stone-100 px-4 py-3 text-xs text-stone-500">
            Latest 60 allowlisted events from the past 24 hours. Sensitive event
            properties, installation IDs, and session IDs are never shown here.
          </div>
          {activity.available ? (
            <ul className="divide-y divide-stone-100">
              {activity.events.map((event) => (
                <li
                  key={event.id}
                  className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusPill tone={event.tone}>{event.category}</StatusPill>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-stone-800">
                        {event.actorId ? (
                          <Link
                            href={`/admin/users/${event.actorId}`}
                            className="font-bold hover:text-violet-700"
                          >
                            {event.actor}
                          </Link>
                        ) : (
                          <span className="font-bold">{event.actor}</span>
                        )}{" "}
                        {event.action.toLowerCase()}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {formatRelativeDate(event.occurredAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-400 md:justify-end">
                    <span>{platformLabel(event.platform)}</span>
                    <span aria-hidden="true">·</span>
                    <span>v{event.appVersion}</span>
                    {event.appEnvironment !== "production" ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold uppercase text-amber-700">
                          {event.appEnvironment}
                        </span>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
              {activity.events.length === 0 ? (
                <li>
                  <EmptyState>
                    No product events have arrived in the last 24 hours.
                  </EmptyState>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Live actions will appear after the product-event migration and
              mobile instrumentation are deployed.
            </p>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}

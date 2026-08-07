import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import KpiCard from "@/components/KpiCard";
import UserBadge from "@/components/UserBadge";
import { PageHeader, Panel, StatusPill } from "@/components/AdminPrimitives";
import {
  fetchDashboardKpis,
  fetchLatestActivity,
  fetchTopActivity,
} from "@/lib/data";
import { formatCityRegion, formatRelativeDate } from "@/lib/format";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const LATEST_COUNT = 10;

const overall = (taste: number | null, presentation: number | null) =>
  taste == null || presentation == null
    ? "—"
    : (Math.round(((taste + presentation) / 2) * 10) / 10).toFixed(1);

const Rank = ({ index }: { index: number }) => (
  <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-stone-400">
    {String(index + 1).padStart(2, "0")}
  </span>
);

export default async function Dashboard() {
  const range = parseRange({});
  const [kpis, latest, top] = await Promise.all([
    fetchDashboardKpis(range),
    fetchLatestActivity(LATEST_COUNT),
    fetchTopActivity(LATEST_COUNT),
  ]);

  return (
    <AdminShell active="dashboard">
      <PageHeader
        eyebrow="Operator console"
        title="Dashboard"
        description="Start here when you want the club's current shape: what changed, what needs a look, and where to jump next."
        stats={[
          { label: "Total members", value: kpis.users.total, tone: "green" },
          { label: "Total reviews", value: kpis.reviews.total, tone: "purple" },
          {
            label: "Total locations",
            value: kpis.locations.total,
            tone: "chartreuse",
          },
        ]}
        statColumns={3}
        surface="transparent"
        density="compact"
      />

      <div className="space-y-5 px-8 pb-6 pt-2">
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
            color="#6B53A8"
            rangeLabel={range.label}
            className="col-span-12 xl:col-span-4"
          />
          <KpiCard
            label="New locations"
            metric={kpis.locations}
            newLabel="locations"
            href="/admin/locations"
            color="#D6E640"
            rangeLabel={range.label}
            className="col-span-12 xl:col-span-4"
          />
        </section>

        <section className="grid grid-cols-12 gap-4">
          <Panel
            title="Newest members"
            href="/admin/users"
            linkLabel="Members"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {latest.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <Link
                    href={`/admin/users/${member.id}`}
                    className="min-w-0 hover:opacity-80"
                  >
                    <UserBadge profile={member} size="compact" />
                  </Link>
                  <span className="shrink-0 text-xs text-stone-400">
                    {member.created_at
                      ? formatRelativeDate(member.created_at)
                      : "—"}
                  </span>
                </li>
              ))}
              {latest.members.length === 0 ? (
                <li className="px-4 py-8 text-sm text-stone-400">
                  No members yet.
                </li>
              ) : null}
            </ul>
          </Panel>

          <Panel
            title="Latest reviews"
            href="/admin/reviews"
            linkLabel="Reviews"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {latest.reviews.map((review) => (
                <li key={review.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-900">
                        {review.location?.name ?? "Unknown location"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        @{review.profile?.username ?? "unknown"} ·{" "}
                        {formatRelativeDate(review.inserted_at)}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-emerald-950">
                      {overall(review.taste, review.presentation)}
                    </span>
                  </div>
                  {review.state !== 1 ? (
                    <div className="mt-2">
                      <StatusPill>Inactive</StatusPill>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Newest locations"
            href="/admin/locations"
            linkLabel="Locations"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {latest.locations.map((location) => (
                <li
                  key={location.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {location.name ?? "—"}
                    </span>
                    <span className="block truncate text-xs text-stone-500">
                      {formatCityRegion(location.address) || "No address"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">
                    {location.inserted_at
                      ? formatRelativeDate(location.inserted_at)
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>

        <section className="grid grid-cols-12 gap-4">
          <Panel
            title="Most reviews"
            href="/admin/users"
            linkLabel="Members"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {top.members.map((member, index) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Rank index={index} />
                    <Link
                      href={`/admin/users/${member.id}`}
                      className="min-w-0 hover:opacity-80"
                    >
                      <UserBadge profile={member} size="compact" />
                    </Link>
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {member.review_count ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Most engaged reviews"
            href="/admin/reviews"
            linkLabel="Reviews"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {top.reviews.map((review, index) => (
                <li key={review.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <Rank index={index} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {review.location?.name ?? "Unknown location"}
                        </span>
                        <span className="block truncate text-xs text-stone-500">
                          @{review.profile?.username ?? "unknown"} ·{" "}
                          {overall(review.taste, review.presentation)}
                        </span>
                      </span>
                    </span>
                    <Link
                      href={`/r/${encodeURIComponent(review.id)}`}
                      target="_blank"
                      className="shrink-0 text-xs font-bold text-violet-700 hover:text-violet-800"
                    >
                      {review.likes} / {review.comments}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Top locations"
            href="/admin/locations"
            linkLabel="Locations"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {top.locations.map((location, index) => (
                <li
                  key={location.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Rank index={index} />
                    <span className="truncate text-sm font-bold">
                      {location.name ?? "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">
                    <span className="font-mono font-semibold tabular-nums text-stone-900">
                      {location.rating == null
                        ? "—"
                        : Number(location.rating).toFixed(1)}
                    </span>{" "}
                    · {location.total_ratings} reviews
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      </div>
    </AdminShell>
  );
}

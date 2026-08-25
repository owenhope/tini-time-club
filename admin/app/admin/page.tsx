import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import KpiCard from "@/components/KpiCard";
import UserBadge from "@/components/UserBadge";
import { PageHeader, Panel, StatusPill } from "@/components/AdminPrimitives";
import { fetchDashboardKpis } from "@/lib/analyticsData";
import {
  fetchLatestActivity,
  fetchTopActivity,
} from "@/lib/dashboardActivityData";
import {
  formatCityRegion,
  formatOverallRating,
  formatRelativeDate,
} from "@/lib/format";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const LATEST_COUNT = 10;

const Rank = ({ index }: { index: number }) => (
  <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-stone-400">
    {String(index + 1).padStart(2, "0")}
  </span>
);

const dashboardRowClass = "flex h-16 items-center justify-between gap-3 px-4";
const dashboardRowLinkClass = `${dashboardRowClass} transition hover:bg-stone-50 focus:bg-stone-50 focus:outline-none`;

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
          {
            label: "Total reviews",
            value: kpis.reviews.total,
            tone: "chartreuse",
          },
          {
            label: "Total places",
            value: kpis.locations.total,
            tone: "purple",
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

        <section className="grid grid-cols-12 gap-4">
          <Panel
            title="Newest members"
            href="/admin/users"
            linkLabel="Members"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {latest.members.map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/admin/users/${member.id}`}
                    className={dashboardRowLinkClass}
                  >
                    <span className="min-w-0">
                      <UserBadge profile={member} size="compact" />
                    </span>
                    <span className="shrink-0 text-xs text-stone-400">
                      {member.created_at
                        ? formatRelativeDate(member.created_at)
                        : "—"}
                    </span>
                  </Link>
                </li>
              ))}
              {latest.members.length === 0 ? (
                <li className="flex h-16 items-center px-4 text-sm text-stone-400">
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
                <li key={review.id}>
                  <Link
                    href={`/admin/reviews/${review.id}`}
                    className={dashboardRowLinkClass}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-900">
                        {review.location?.name ?? "Unknown place"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-stone-500">
                        <span className="min-w-0 truncate">
                          @{review.profile?.username ?? "unknown"} ·{" "}
                          {formatRelativeDate(review.inserted_at)}
                        </span>
                        {review.state !== 1 ? (
                          <StatusPill>Inactive</StatusPill>
                        ) : null}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-emerald-950">
                      {formatOverallRating(review.taste, review.presentation)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Newest places"
            href="/admin/places"
            linkLabel="Places"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {latest.locations.map((location) => (
                <li key={location.id}>
                  <Link
                    href={`/admin/places/${location.id}`}
                    className={dashboardRowLinkClass}
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
                  </Link>
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
                <li key={member.id}>
                  <Link
                    href={`/admin/users/${member.id}`}
                    className={dashboardRowLinkClass}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Rank index={index} />
                      <UserBadge profile={member} size="compact" />
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {member.review_count ?? 0}
                    </span>
                  </Link>
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
                <li key={review.id}>
                  <Link
                    href={`/admin/reviews/${review.id}`}
                    className={dashboardRowLinkClass}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Rank index={index} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {review.location?.name ?? "Unknown place"}
                        </span>
                        <span className="block truncate text-xs text-stone-500">
                          @{review.profile?.username ?? "unknown"} ·{" "}
                          {formatOverallRating(
                            review.taste,
                            review.presentation
                          )}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-violet-700">
                      {review.likes} / {review.comments}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Top places"
            href="/admin/places"
            linkLabel="Places"
            className="col-span-12 xl:col-span-4"
          >
            <ul className="divide-y divide-stone-100">
              {top.locations.map((location, index) => (
                <li key={location.id}>
                  <Link
                    href={`/admin/places/${location.id}`}
                    className={dashboardRowLinkClass}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Rank index={index} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {location.name ?? "—"}
                        </span>
                        <span className="block truncate text-xs text-stone-500">
                          {location.total_ratings} reviews
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-stone-900">
                      {location.rating == null
                        ? "—"
                        : Number(location.rating).toFixed(1)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      </div>
    </AdminShell>
  );
}

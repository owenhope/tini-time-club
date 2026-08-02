import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import KpiCard from "@/components/KpiCard";
import RangePicker from "@/components/RangePicker";
import UserBadge from "@/components/UserBadge";
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
  <span className="w-4 shrink-0 text-sm tabular-nums text-stone-400">
    {index + 1}
  </span>
);

/** A titled card wrapping one of the dashboard lists. */
const ListCard = ({
  title,
  href,
  linkLabel,
  empty,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  empty: string;
  children: React.ReactNode[];
}) => (
  <div className="rounded-2xl border border-stone-200 bg-white p-5">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-semibold">{title}</h2>
      <Link
        href={href}
        className="text-sm font-medium text-violet-600 hover:text-violet-800"
      >
        {linkLabel} →
      </Link>
    </div>
    <ul className="mt-2 divide-y divide-stone-100">
      {children.length > 0 ? (
        children
      ) : (
        <li className="py-2.5 text-sm text-stone-400">{empty}</li>
      )}
    </ul>
  </div>
);

/**
 * A snapshot of the three numbers that say whether the club is growing:
 * members, reviews, locations — each with what has just landed. Everything
 * else — per-feature breakdowns and history — lives in Analytics.
 */
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const [kpis, latest, top] = await Promise.all([
    fetchDashboardKpis(range),
    fetchLatestActivity(LATEST_COUNT),
    fetchTopActivity(LATEST_COUNT),
  ]);

  return (
    <AdminShell active="dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-stone-500">{range.label}</p>
        </div>
        <RangePicker path="/admin" range={range} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <KpiCard
          label="Members"
          metric={kpis.users}
          newLabel="new members"
          href="/admin/users"
          color="#059669"
          rangeLabel={range.label}
        />
        <KpiCard
          label="Reviews"
          metric={kpis.reviews}
          newLabel="new reviews"
          href="/admin/reviews"
          color="#7c5ce0"
          rangeLabel={range.label}
        />
        <KpiCard
          label="Locations"
          metric={kpis.locations}
          newLabel="new locations"
          href="/admin/locations"
          color="#d97706"
          rangeLabel={range.label}
        />
      </div>

      {/* Newest first, independent of the range picker above — these answer
          "what just happened", not "how did the window do". */}
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <ListCard
          title="Newest members"
          href="/admin/users"
          linkLabel="All users"
          empty="No members yet."
        >
          {latest.members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <Link
                href={`/admin/users/${member.id}`}
                className="min-w-0 hover:opacity-80"
              >
                <UserBadge profile={member} />
              </Link>
              <span className="shrink-0 text-xs text-stone-400">
                {member.created_at
                  ? formatRelativeDate(member.created_at)
                  : "—"}
              </span>
            </li>
          ))}
        </ListCard>

        <ListCard
          title="Latest reviews"
          href="/admin/reviews"
          linkLabel="All reviews"
          empty="No reviews yet."
        >
          {latest.reviews.map((review) => (
            <li
              key={review.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {review.location?.name ?? "Unknown location"}
                </span>
                <span className="block truncate text-xs text-stone-500">
                  @{review.profile?.username ?? "unknown"} ·{" "}
                  {formatRelativeDate(review.inserted_at)}
                  {review.state !== 1 ? " · inactive" : ""}
                </span>
              </span>
              <Link
                href={`/r/${encodeURIComponent(review.id)}`}
                target="_blank"
                className="shrink-0 text-sm font-semibold tabular-nums text-violet-600 hover:text-violet-800"
                title="Open the public review page"
              >
                {overall(review.taste, review.presentation)}
              </Link>
            </li>
          ))}
        </ListCard>

        <ListCard
          title="Newest locations"
          href="/admin/locations"
          linkLabel="All locations"
          empty="No locations yet."
        >
          {latest.locations.map((location) => (
            <li
              key={location.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
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
        </ListCard>
      </div>

      {/* The all-time leaderboards, same three subjects ranked instead of
          dated. Also range-independent. */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ListCard
          title="Most reviews"
          href="/admin/users"
          linkLabel="All users"
          empty="No members yet."
        >
          {top.members.map((member, index) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Rank index={index} />
                <Link
                  href={`/admin/users/${member.id}`}
                  className="min-w-0 hover:opacity-80"
                >
                  <UserBadge profile={member} />
                </Link>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {member.review_count ?? 0}
              </span>
            </li>
          ))}
        </ListCard>

        <ListCard
          title="Most engaged reviews"
          href="/admin/reviews"
          linkLabel="All reviews"
          empty="No review has been liked or commented on yet."
        >
          {top.reviews.map((review, index) => (
            <li
              key={review.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Rank index={index} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {review.location?.name ?? "Unknown location"}
                  </span>
                  <span className="block truncate text-xs text-stone-500">
                    @{review.profile?.username ?? "unknown"} ·{" "}
                    {overall(review.taste, review.presentation)}
                    {review.state !== 1 ? " · inactive" : ""}
                  </span>
                </span>
              </span>
              <Link
                href={`/r/${encodeURIComponent(review.id)}`}
                target="_blank"
                className="shrink-0 text-xs text-stone-500 hover:text-violet-700"
                title="Open the public review page"
              >
                <span className="font-semibold tabular-nums text-stone-700">
                  {review.likes}
                </span>{" "}
                likes ·{" "}
                <span className="font-semibold tabular-nums text-stone-700">
                  {review.comments}
                </span>
              </Link>
            </li>
          ))}
        </ListCard>

        <ListCard
          title="Top locations"
          href="/admin/locations"
          linkLabel="All locations"
          empty="No location has the 2 reviews needed to rank yet."
        >
          {top.locations.map((location, index) => (
            <li
              key={location.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Rank index={index} />
                <span className="truncate text-sm font-medium">
                  {location.name ?? "—"}
                </span>
              </span>
              <span className="shrink-0 text-xs text-stone-500">
                <span className="font-semibold tabular-nums text-stone-700">
                  {location.rating == null
                    ? "—"
                    : Number(location.rating).toFixed(1)}
                </span>{" "}
                · {location.total_ratings}{" "}
                {location.total_ratings === 1 ? "review" : "reviews"}
              </span>
            </li>
          ))}
        </ListCard>
      </div>

      <p className="mt-6 text-sm text-stone-500">
        Want the per-feature breakdown and history?{" "}
        <Link
          href={`/admin/analytics?${range.query}`}
          className="font-semibold text-violet-600 hover:text-violet-800"
        >
          Open Analytics →
        </Link>
      </p>
    </AdminShell>
  );
}

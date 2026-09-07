import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AnalyticsHeader from "@/components/AnalyticsHeader";
import { DataTable, EmptyState } from "@/components/AdminPrimitives";
import DonutChart from "@/components/DonutChart";
import FeatureSection, { BreakdownList } from "@/components/FeatureSection";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import UserBadge from "@/components/UserBadge";
import { fetchPassportAnalytics } from "@/lib/analytics/passport";
import { PASSPORT_RANK_TIERS, passportTierFor } from "@/lib/ranking";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const shortDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      })
    : "—";

export default async function PassportAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const passport = await fetchPassportAnalytics(range);

  // Distinct point values -> the app's passport rank ladder.
  const tierCounts = new Map<string, number>();
  for (const bucket of passport.pointsDistribution) {
    if (bucket.points <= 0) continue; // members yet to earn a stamp
    const tier = passportTierFor(bucket.points);
    tierCounts.set(tier.key, (tierCounts.get(tier.key) ?? 0) + bucket.count);
  }
  const rankedMembers = [...tierCounts.values()].reduce(
    (total, count) => total + count,
    0
  );
  const tierRows = PASSPORT_RANK_TIERS.map((tier) => {
    const count = tierCounts.get(tier.key) ?? 0;
    return {
      key: tier.key,
      label: tier.name,
      count,
      share: rankedMembers > 0 ? count / rankedMembers : 0,
    };
  }).filter((row) => row.count > 0);

  return (
    <AdminShell active="analytics">
      <AnalyticsHeader
        active="passport"
        range={range}
        title="Passport"
        description="Stamp velocity, points in circulation, and the members climbing the rank ladder."
      />
      <main className="space-y-8 px-8 pb-32 pt-6">
        <FeatureSection
          id="pulse"
          title="Passport pulse"
          description="Stamps and points earned during the selected period, against the all-time book."
        >
          <div className="grid grid-cols-12 gap-4">
            <MetricTile
              label="Stamps awarded"
              value={passport.current.stamps}
              previous={passport.previous.stamps}
              hint={`${passport.totals.stampsAwarded.toLocaleString()} all-time`}
              className="col-span-12 md:col-span-4"
            />
            <MetricTile
              label="Points earned"
              value={passport.current.points}
              previous={passport.previous.points}
              hint={`${passport.totals.pointsInCirculation.toLocaleString()} in circulation`}
              className="col-span-12 border-chartreuse-dark bg-chartreuse/20 md:col-span-4"
            />
            <MetricTile
              label="Members earning"
              value={passport.current.earningMembers}
              previous={passport.previous.earningMembers}
              hint={`${passport.totals.membersWithStamps.toLocaleString()} hold at least one stamp`}
              className="col-span-12 border-violet-300 bg-violet-50 md:col-span-4"
            />
          </div>
          <LineChart
            title="Stamps awarded"
            data={passport.stampsByDay}
            color="#7c3aed"
            unit="stamps"
          />
        </FeatureSection>

        <FeatureSection
          id="ranks"
          title="Rank ladder"
          description="Where members with Passport points sit on the app's rank ladder (Well, Call, Premium, Top Shelf)."
        >
          {tierRows.length ? (
            <DonutChart
              title="Members by rank"
              rows={tierRows}
              total={rankedMembers}
            />
          ) : (
            <EmptyState>
              No ranked members yet — they appear once their first stamps land.
            </EmptyState>
          )}
        </FeatureSection>

        <FeatureSection
          id="stamps"
          title="Most-earned stamps"
          description="The catalog entries members completed most during the selected period."
        >
          <BreakdownList
            title="Top stamps this period"
            rows={passport.topStamps.map((stamp) => ({
              key: stamp.key,
              label: `${stamp.title} · ${stamp.label}`,
              value: `${stamp.awardCount.toLocaleString()} awarded`,
              meta: `${stamp.series} · +${stamp.points} pts`,
            }))}
            empty="No stamps were earned during this period."
          />
        </FeatureSection>

        <FeatureSection
          id="leaders"
          title="Points leaderboard"
          description="The members holding the most Passport points, all-time."
        >
          <DataTable
            columns={["Member", "Rank", "Points", "Stamps", "Last stamp"]}
            empty={
              <EmptyState>No member holds Passport points yet.</EmptyState>
            }
          >
            {passport.topMembers.map((member) => {
              const tier = passportTierFor(member.passportPoints);
              return (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${member.id}`}>
                      <UserBadge profile={member} size="compact" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: tier.color }}
                    >
                      {tier.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {member.passportPoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {member.stampCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {shortDate(member.lastAwardAt)}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </FeatureSection>

        <FeatureSection
          id="recent"
          title="Recent awards"
          description="The latest stamps earned during the selected period."
        >
          <DataTable
            columns={["Member", "Stamp", "Series", "Points", "Awarded"]}
            empty={
              <EmptyState>
                No stamps were awarded in this period — widen the range.
              </EmptyState>
            }
          >
            {passport.recentAwards.map((award) => (
              <tr key={award.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${award.profile.id}`}>
                    <UserBadge profile={award.profile} size="compact" />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold">{award.title}</span>
                  <span className="text-stone-500"> · {award.label}</span>
                </td>
                <td className="px-4 py-3 text-stone-500">{award.series}</td>
                <td className="px-4 py-3 tabular-nums">+{award.points}</td>
                <td className="px-4 py-3 text-stone-500">
                  {shortDate(award.awardedAt)}
                </td>
              </tr>
            ))}
          </DataTable>
        </FeatureSection>
      </main>
    </AdminShell>
  );
}

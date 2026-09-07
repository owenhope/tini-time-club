import { count, dayCounts, record } from "./model.mjs";

const profile = (value) => {
  const row = record(value);
  return {
    id: String(row.id ?? ""),
    username: row.username == null ? null : String(row.username),
    name: row.name == null ? null : String(row.name),
    avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    is_verified: Boolean(row.is_verified),
    deleted: Boolean(row.deleted),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
    review_count: count(row.review_count),
    passport_points: count(row.passport_points),
    bio: row.bio == null ? null : String(row.bio),
  };
};

const totals = (value) => {
  const row = record(value);
  return {
    stampsAwarded: count(row.stampsAwarded),
    membersWithStamps: count(row.membersWithStamps),
    pointsInCirculation: count(row.pointsInCirculation),
  };
};

const period = (value) => {
  const row = record(value);
  return {
    stamps: count(row.stamps),
    points: count(row.points),
    earningMembers: count(row.earningMembers),
  };
};

export const resolvePassport = (value) => {
  const row = record(value);
  return {
    totals: totals(row.totals),
    current: period(row.current),
    previous: period(row.previous),
    stampsByDay: dayCounts(row.stampsByDay),
    pointsDistribution: (Array.isArray(row.pointsDistribution)
      ? row.pointsDistribution
      : []
    ).map((bucket) => ({
      points: count(record(bucket).points),
      count: count(record(bucket).count),
    })),
    topStamps: (Array.isArray(row.topStamps) ? row.topStamps : []).map(
      (value) => {
        const stamp = record(value);
        return {
          key: String(stamp.key ?? ""),
          series: String(stamp.series ?? ""),
          title: String(stamp.title ?? ""),
          label: String(stamp.label ?? ""),
          points: count(stamp.points),
          awardCount: count(stamp.awardCount),
          lastAwardedAt: String(stamp.lastAwardedAt ?? ""),
        };
      }
    ),
    topMembers: (Array.isArray(row.topMembers) ? row.topMembers : []).map(
      (value) => {
        const member = record(value);
        return {
          ...profile(member),
          passportPoints: count(member.passport_points),
          stampCount: count(member.stamp_count),
          lastAwardAt:
            member.last_award_at == null ? null : String(member.last_award_at),
        };
      }
    ),
    recentAwards: (Array.isArray(row.recentAwards) ? row.recentAwards : []).map(
      (value) => {
        const award = record(value);
        return {
          id: String(award.id ?? ""),
          awardedAt: String(award.awardedAt ?? ""),
          title: String(award.title ?? ""),
          label: String(award.label ?? ""),
          series: String(award.series ?? ""),
          points: count(award.points),
          profile: profile(award.profile),
        };
      }
    ),
  };
};

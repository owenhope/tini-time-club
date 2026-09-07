import { PASSPORT_RANK_TIERS } from "./ranking";

export interface TierDistributionRow {
  tier: string;
  color: string;
  count: number;
  /** Passport points that earn the tier. */
  min: number;
  /** Last point count still inside the tier; null at the top. */
  max: number | null;
  /** The tier above, and the point count that reaches it. */
  next: { tier: string; min: number } | null;
}

const tierRow = (index: number, count: number): TierDistributionRow => {
  const tier = PASSPORT_RANK_TIERS[index];
  const next = PASSPORT_RANK_TIERS[index + 1];
  return {
    tier: tier.name,
    color: tier.color,
    count,
    min: tier.min,
    max: next ? next.min - 1 : null,
    next: next ? { tier: next.name, min: next.min } : null,
  };
};

export const buildTierDistributionFromCounts = (
  counts: number[]
): TierDistributionRow[] =>
  PASSPORT_RANK_TIERS.map((_, index) => tierRow(index, counts[index] ?? 0));

export const buildTierDistribution = (
  profiles: { passport_points: number | null }[]
): TierDistributionRow[] =>
  buildTierDistributionFromCounts(
    PASSPORT_RANK_TIERS.map((tier, index) => {
      const next = PASSPORT_RANK_TIERS[index + 1];
      return profiles.filter(
        (profile) =>
          (profile.passport_points ?? 0) >= tier.min &&
          (!next || (profile.passport_points ?? 0) < next.min)
      ).length;
    })
  );

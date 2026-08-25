import { RANK_TIERS } from "./ranking";

export interface TierDistributionRow {
  tier: string;
  color: string;
  count: number;
  /** Review count that earns the tier. */
  min: number;
  /** Last review count still inside the tier; null at the top. */
  max: number | null;
  /** The tier above, and the review count that reaches it. */
  next: { tier: string; min: number } | null;
}

const tierRow = (index: number, count: number): TierDistributionRow => {
  const tier = RANK_TIERS[index];
  const next = RANK_TIERS[index + 1];
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
  RANK_TIERS.map((_, index) => tierRow(index, counts[index] ?? 0));

export const buildTierDistribution = (
  profiles: { review_count: number | null }[]
): TierDistributionRow[] =>
  buildTierDistributionFromCounts(
    RANK_TIERS.map((tier, index) => {
      const next = RANK_TIERS[index + 1];
      return profiles.filter(
        (profile) =>
          (profile.review_count ?? 0) >= tier.min &&
          (!next || (profile.review_count ?? 0) < next.min)
      ).length;
    })
  );

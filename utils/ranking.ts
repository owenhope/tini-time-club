/**
 * Review-count ranking tiers ("avatar rings").
 *
 * A profile's tier is derived from how many active reviews they've posted
 * (profiles.review_count, trigger-maintained). The first tier starts at zero,
 * so every profile holds a rank. The ring is a slowly rotating two-tone
 * gradient of the tier color; see components/shared/AvatarRing.tsx.
 *
 * Tier names follow the bar's liquor-shelf ladder — well, call, premium,
 * top shelf. Everyone starts in the well.
 *
 * Colors are fixed hex rather than theme tokens: a tier reads the same in
 * light and dark mode, like a medal.
 */

export interface RankTier {
  key: "well" | "call" | "premium" | "topShelf";
  name: string;
  /** Minimum active reviews to hold this tier. */
  min: number;
  /** Primary tier color, used for labels and as the ring's midtone. */
  color: string;
  /** Light end of the rotating ring gradient. */
  sheen: string;
  /** Dark end of the rotating ring gradient. */
  shade: string;
}

export const RANK_TIERS: readonly RankTier[] = [
  {
    key: "well",
    name: "Well",
    min: 0,
    color: "#B4783A",
    sheen: "#E3B27C",
    shade: "#6F4518",
  },
  {
    key: "call",
    name: "Call",
    min: 10,
    color: "#9BA6B2",
    sheen: "#EDF2F7",
    shade: "#5F6B78",
  },
  {
    key: "premium",
    name: "Premium",
    min: 50,
    color: "#D4AF37",
    sheen: "#FAF0A8",
    shade: "#8F701A",
  },
  {
    key: "topShelf",
    name: "Top Shelf",
    min: 150,
    color: "#8E7CE8",
    sheen: "#D9D1FB",
    shade: "#5240B5",
  },
] as const;

/** The tier held at a given review count. Nullish counts as zero, and the
    first tier starts at zero, so this never returns null in practice; the
    nullable type is kept so callers stay guarded if the floor moves. */
export const getRankTier = (
  reviewCount: number | null | undefined
): RankTier | null => {
  const count = reviewCount ?? 0;
  let held: RankTier | null = null;
  for (const tier of RANK_TIERS) {
    if (count >= tier.min) held = tier;
  }
  return held;
};

export interface RankProgress {
  tier: RankTier | null;
  /** The next tier up, or null at the top. */
  next: RankTier | null;
  /** Reviews still needed to reach `next` (0 when at the top). */
  remaining: number;
  /** 0..1 progress from the current tier's floor to the next tier's. */
  fraction: number;
}

/** Where a review count sits between its tier and the next. */
export const getRankProgress = (
  reviewCount: number | null | undefined
): RankProgress => {
  const count = Math.max(0, reviewCount ?? 0);
  const tier = getRankTier(count);
  const next = RANK_TIERS.find((t) => t.min > count) ?? null;

  if (!next) {
    return { tier, next: null, remaining: 0, fraction: 1 };
  }

  const floor = tier?.min ?? 0;
  return {
    tier,
    next,
    remaining: next.min - count,
    fraction: (count - floor) / (next.min - floor),
  };
};

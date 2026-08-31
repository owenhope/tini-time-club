/**
 * Admin's local adapter for the rank model.
 *
 * The admin app is built as an isolated Next application, so importing the
 * mobile app's source tree works in TypeScript but fails in Turbopack. Keep
 * this model local until the two apps have a real shared package.
 */
export interface RankTier {
  key: "well" | "call" | "premium" | "topShelf";
  name: string;
  min: number;
  color: string;
  sheen: string;
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

export const tierFor = (reviewCount: number | null | undefined) =>
  getRankTier(reviewCount) ?? RANK_TIERS[0];

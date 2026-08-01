import type { AdminProfile } from "@/lib/data";
import VerifiedBadge from "@/components/VerifiedBadge";

/** The four in-app rank tiers, mirrored from utils/ranking.ts. */
const TIERS = [
  { name: "Well", min: 0, color: "#B4783A" },
  { name: "Call", min: 10, color: "#9BA6B2" },
  { name: "Premium", min: 50, color: "#D4AF37" },
  { name: "Top Shelf", min: 150, color: "#8E7CE8" },
];

export const tierFor = (reviewCount: number | null | undefined) => {
  let held = TIERS[0];
  for (const tier of TIERS) {
    if ((reviewCount ?? 0) >= tier.min) held = tier;
  }
  return held;
};

export default function UserBadge({ profile }: { profile: AdminProfile }) {
  const tier = tierFor(profile.review_count);
  const initial = (profile.username ?? "?").charAt(0).toUpperCase();

  return (
    <span className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] bg-stone-100 text-sm font-semibold text-stone-600"
        style={{ borderColor: tier.color }}
        title={`${tier.name} — ${profile.review_count ?? 0} reviews`}
      >
        {initial}
      </span>
      <span>
        <span className="flex items-center gap-1.5 font-medium">
          {profile.username ?? "(no username)"}
          {profile.is_verified ? <VerifiedBadge /> : null}
          {profile.deleted ? (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
              deleted
            </span>
          ) : null}
        </span>
        <span className="block text-xs text-stone-500">
          {tier.name} · {profile.review_count ?? 0} reviews
          {profile.email ? ` · ${profile.email}` : ""}
        </span>
      </span>
    </span>
  );
}

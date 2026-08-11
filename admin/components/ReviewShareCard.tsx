"use client";

import { useId } from "react";
import {
  formatCityRegion,
  formatRating,
  formatRelativeDate,
  stripNameFromAddress,
} from "@/lib/format";

/**
 * Web replica of the mobile app's ReviewItem (components/ReviewItem.tsx).
 * Layout and colors mirror the native card: ranked identity, a 16:11 photo,
 * photo pills and venue plate, olive ratings, the large overall numeral,
 * caption, comments, and actions. Values come from the app's
 * theme tokens (spacing, typography, palette) — keep them in sync by eye.
 */

export interface ShareCardComment {
  id: number;
  body: string;
  username: string | null;
  is_verified: boolean | null;
}

export interface ShareCardReview {
  id: string;
  comment: string | null;
  image_public_url: string | null;
  inserted_at: string;
  taste: number | null;
  presentation: number | null;
  likes_count: number;
  comments_count: number;
  recent_comments: ShareCardComment[];
  location: {
    name: string | null;
    address: string | null;
    rating: number | null;
    total_ratings: number | null;
  } | null;
  spirit: { name: string | null } | null;
  type: { name: string | null } | null;
  profile: {
    username: string | null;
    is_verified: boolean | null;
    avatar_public_url: string | null;
    review_count: number | null;
  } | null;
}

// Palette + rank tiers vendored from the app (theme/tokens.ts, utils/ranking.ts).
const ACCENT = "#7B60BC"; // lavender600 — verified badge on white
const TEXT = "#1C3A2E";
const TEXT_SECONDARY = "#3F4B46";
const TEXT_MUTED = "#6E7472";
const ACTION_ICON = "#000000";
const SECONDARY = "#336654";
const PIMENTO = "#E8763D";
const PIP_EMPTY = "#8FB8A8";
const SCRIM_STRONG = "rgba(20,26,23,0.65)";
const HIGHLIGHT = "#F2FF71";
const tagColors = (name: string | null | undefined) => {
  switch (name?.trim().toLowerCase()) {
    case "vesper":
      return { background: "#426B8A", color: "#FAF9F6" };
    case "twist":
      return { background: HIGHLIGHT, color: TEXT };
    case "vodka":
      return { background: "#EA6360", color: "#FFFFFF" };
    case "gin":
      return { background: "#E8763D", color: "#FAF9F6" };
    case "dirty":
      return { background: "#667A3E", color: "#FAF9F6" };
    case "espresso":
      return { background: "#6F4518", color: "#FAF9F6" };
    default:
      return null;
  }
};

const RANK_TIERS: { min: number; sheen: string; shade: string }[] = [
  { min: 0, sheen: "#E3B27C", shade: "#6F4518" },
  { min: 10, sheen: "#EDF2F7", shade: "#5F6B78" },
  { min: 50, sheen: "#FAF0A8", shade: "#8F701A" },
  { min: 150, sheen: "#D9D1FB", shade: "#5240B5" },
];

const rankTier = (reviewCount?: number | null) => {
  const count = reviewCount ?? 0;
  let held = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (count >= tier.min) held = tier;
  }
  return held;
};

/* Ionicons path data (512 viewBox), matching the icons the app renders. */
const Icon = ({
  size,
  color,
  children,
  label,
}: {
  size: number;
  color: string;
  children: React.ReactNode;
  label?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    role={label ? "img" : "presentation"}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    style={{ color, display: "block" }}
  >
    {children}
  </svg>
);

const HeartOutline = ({ size }: { size: number }) => (
  <Icon size={size} color={ACTION_ICON} label="Likes">
    <path
      d="M352.92 80C288 80 256 144 256 144s-32-64-96.92-64C106.32 80 64.54 124.14 64 176.81c-1.1 109.33 86.73 187.08 183 252.42a16 16 0 0 0 18 0c96.26-65.34 184.09-143.09 183-252.42C447.46 124.14 405.68 80 352.92 80Z"
      stroke="currentColor"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const ChatOutline = ({ size }: { size: number }) => (
  <Icon size={size} color={ACTION_ICON} label="Comments">
    <path
      d="M87.49 380c1.19-4.38-1.44-10.47-3.95-14.86a44.86 44.86 0 0 0-2.54-3.8 199.81 199.81 0 0 1-33-110C47.65 139.09 140.73 48 255.83 48 356.21 48 440 117.54 459.58 209.85a199 199 0 0 1 4.42 41.64c0 112.41-89.49 204.93-204.59 204.93-18.3 0-43-4.6-56.47-8.37s-26.92-8.77-30.39-10.11a31.09 31.09 0 0 0-11.12-2.07 30.71 30.71 0 0 0-12.09 2.43l-67.83 24.48a16 16 0 0 1-4.67 1.22 9.6 9.6 0 0 1-9.57-9.74 15.85 15.85 0 0 1 .6-3.29Z"
      stroke="currentColor"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const PaperPlaneOutline = ({ size }: { size: number }) => (
  <Icon size={size} color={ACTION_ICON} label="Share">
    <path
      d="M53.12 199.94l400-151.39a8 8 0 0 1 10.33 10.33l-151.39 400a8 8 0 0 1-15-.34l-67.4-166.09a16 16 0 0 0-10.11-10.11L53.46 215a8 8 0 0 1-.34-15.06Z"
      stroke="currentColor"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M460 52 227 285"
      stroke="currentColor"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const ChevronForward = ({ size, color }: { size: number; color: string }) => (
  <Icon size={size} color={color}>
    <path
      d="M184 112 328 256 184 400"
      fill="none"
      stroke="currentColor"
      strokeWidth="48"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const EllipsisIcon = ({ size }: { size: number }) => (
  <Icon size={size} color={TEXT} label="More options">
    <circle cx="256" cy="256" r="32" fill="currentColor" />
    <circle cx="416" cy="256" r="32" fill="currentColor" />
    <circle cx="96" cy="256" r="32" fill="currentColor" />
  </Icon>
);

const VerifiedBadge = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role="img"
    aria-label="Verified"
    style={{ color: ACCENT, display: "inline", verticalAlign: "-1px" }}
  >
    <path
      d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"
      fill="currentColor"
    />
  </svg>
);

/** The rank ring: tier gradient rotating at 6s/turn, as on mobile. */
const AvatarWithRing = ({
  avatarUrl,
  username,
  reviewCount,
  size,
}: {
  avatarUrl: string | null;
  username: string | null;
  reviewCount: number | null;
  size: number;
}) => {
  const tier = rankTier(reviewCount);
  const borderWidth = size < 36 ? 3 : size < 64 ? 4 : 6;
  const inset = borderWidth + 1;
  const diameter = size + inset * 2;
  const center = diameter / 2;
  // Colons are invalid inside a url(#...) reference.
  const gradientId = `ring-${useId().replace(/:/g, "")}`;

  const face = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- public bucket URL
    <img
      src={avatarUrl}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: ACCENT,
        fontSize: size * 0.4,
      }}
    >
      {(username ?? "T").charAt(0).toUpperCase()}
    </span>
  );

  return (
    <span
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: diameter, height: diameter }}
    >
      <svg
        width={diameter}
        height={diameter}
        className="pointer-events-none absolute inset-0 motion-safe:animate-[ttc-ring-spin_6s_linear_infinite]"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tier.shade} />
            <stop offset="0.5" stopColor={tier.sheen} />
            <stop offset="1" stopColor={tier.shade} />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={center - borderWidth / 2}
          stroke={`url(#${gradientId})`}
          strokeWidth={borderWidth}
          fill="none"
        />
      </svg>
      {face}
    </span>
  );
};

const RatingPips = ({
  value,
  max = 5,
  size = 15,
}: {
  value: number | null;
  max?: number;
  size?: number;
}) => {
  const clamped = Math.max(0, Math.min(value ?? 0, max));

  return (
    <span
      className="flex items-center"
      style={{ gap: size * 0.28 }}
      role="img"
      aria-label={`${formatRating(value)} out of ${max} olives`}
    >
      {Array.from({ length: max }, (_, index) => {
        const fill = Number(
          Math.max(0, Math.min(1, clamped - index)).toFixed(2)
        );
        return (
          <span
            key={index}
            className="relative block shrink-0 rounded-[50%]"
            style={{
              width: size * 0.84,
              height: size,
              background: fill > 0 ? SECONDARY : "transparent",
              border: fill > 0 ? "none" : `2px solid ${PIP_EMPTY}`,
              opacity: fill > 0 ? fill : 1,
            }}
          >
            {fill > 0 ? (
              <span
                className="absolute rounded-full"
                style={{
                  top: size * 0.16,
                  right: size * 0.1,
                  width: size * 0.3,
                  height: size * 0.3,
                  background: PIMENTO,
                }}
              />
            ) : null}
          </span>
        );
      })}
    </span>
  );
};

const InlineIdentityText = ({
  username,
  isVerified,
  body,
  usernameClass,
  bodyClass,
}: {
  username: string;
  isVerified?: boolean | null;
  body: string;
  usernameClass: string;
  bodyClass: string;
}) => (
  <p className={bodyClass} style={{ color: TEXT }}>
    <span className={usernameClass}>{username}</span>
    {isVerified ? <VerifiedBadge size={13} /> : null} {body}
  </p>
);

export default function ReviewShareCard({
  review,
  shareUrl,
}: {
  review: ShareCardReview;
  shareUrl: string;
}) {
  const overall =
    review.taste == null || review.presentation == null
      ? null
      : Math.round(((review.taste + review.presentation) / 2) * 10) / 10;

  const username = review.profile?.username ?? "tini-time";
  const locationReviewCount = review.location?.total_ratings ?? 0;
  const venueRating =
    review.location?.rating != null && locationReviewCount > 0
      ? Number(review.location.rating)
      : null;
  const cityRegion = review.location?.address
    ? formatCityRegion(
        stripNameFromAddress(
          review.location.name ?? "",
          review.location.address
        )
      )
    : "";
  const spiritTagColors = tagColors(review.spirit?.name);
  const typeTagColors = tagColors(review.type?.name);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  };

  return (
    <article className="overflow-hidden rounded-[8px] border border-[rgba(51,102,84,0.18)] bg-white shadow-[0_4px_14px_rgba(28,58,46,0.08)]">
      <style>{`@keyframes ttc-ring-spin { to { transform: rotate(360deg); } }`}</style>

      <div className="flex items-center justify-between bg-white py-3 pl-[15px] pr-3">
        <span className="flex min-w-0 items-center gap-[11px]">
          <AvatarWithRing
            avatarUrl={review.profile?.avatar_public_url ?? null}
            username={review.profile?.username ?? null}
            reviewCount={review.profile?.review_count ?? null}
            size={46}
          />
          <span className="min-w-0">
            <p
              className="truncate text-[15px] font-extrabold leading-[18px]"
              style={{ color: TEXT }}
            >
              {username}
              {review.profile?.is_verified ? (
                <>
                  {" "}
                  <VerifiedBadge size={13} />
                </>
              ) : null}
            </p>
            <p
              className="mt-[3px] font-mono text-xs leading-4"
              style={{ color: TEXT_MUTED }}
            >
              {formatRelativeDate(review.inserted_at)}
            </p>
          </span>
        </span>
        <span className="p-1">
          <EllipsisIcon size={20} />
        </span>
      </div>

      <div className="relative aspect-[16/11] bg-[#E5E6E8]">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
        <img
          src={review.image_public_url ?? "/nightlife-martini-table.png"}
          alt={`Review at ${review.location?.name ?? "a Martini spot"}`}
          className="h-full w-full object-cover"
        />

        <div className="absolute right-3 top-3 flex gap-1.5">
          {review.spirit?.name ? (
            <span
              className="rounded-full px-[11px] py-[7px] text-[10.5px] font-bold uppercase leading-[13px] tracking-[1px]"
              style={
                spiritTagColors ?? { background: HIGHLIGHT, color: SECONDARY }
              }
            >
              {review.spirit.name}
            </span>
          ) : null}
          {review.type?.name ? (
            <span
              className="rounded-full px-[11px] py-[7px] text-[10.5px] font-bold uppercase leading-[13px] tracking-[1px]"
              style={
                typeTagColors ?? { background: SCRIM_STRONG, color: "#FFFFFF" }
              }
            >
              {review.type.name}
            </span>
          ) : null}
        </div>

        <div
          className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] rounded-[8px] px-3 py-2 text-white"
          style={{ background: SCRIM_STRONG }}
        >
          <p className="flex min-w-0 items-center text-[15px] font-bold leading-5">
            <span className="truncate">
              {review.location?.name ?? "Martini review"}
            </span>
            <ChevronForward size={14} color="#8FB8A8" />
          </p>
          {cityRegion ? (
            <p className="truncate font-mono text-[13px] leading-[18px] text-[#8FB8A8]">
              {cityRegion}
            </p>
          ) : null}
          {venueRating != null ? (
            <span className="mt-0.5 flex items-center gap-[5px]">
              <RatingPips value={1} max={1} size={13} />
              <span className="truncate font-mono text-[13px] leading-[18px] text-white">
                {formatRating(venueRating)} ·{" "}
                {locationReviewCount === 1
                  ? "1 review"
                  : `${locationReviewCount} reviews`}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-start gap-5 bg-white px-4 pt-[14px]">
        <div className="space-y-[7px]">
          <p
            className="text-[10px] font-bold uppercase tracking-[1px]"
            style={{ color: TEXT_MUTED }}
          >
            Taste
          </p>
          <RatingPips value={review.taste} />
        </div>
        <div className="space-y-[7px]">
          <p
            className="text-[10px] font-bold uppercase tracking-[1px]"
            style={{ color: TEXT_MUTED }}
          >
            Presentation
          </p>
          <RatingPips value={review.presentation} />
        </div>
        {overall != null ? (
          <div className="ml-auto flex flex-col items-end gap-[3px]">
            <p
              className="text-[10px] font-bold uppercase tracking-[1px]"
              style={{ color: TEXT_MUTED }}
            >
              Overall
            </p>
            <p
              className="text-[26px] font-black leading-7 tabular-nums"
              style={{ color: SECONDARY }}
            >
              {formatRating(overall)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="bg-white px-4 pt-[11px]">
        {review.comment ? (
          <div className="mb-1">
            <InlineIdentityText
              username={username}
              isVerified={review.profile?.is_verified}
              body={review.comment}
              usernameClass="text-sm font-bold"
              bodyClass="text-sm leading-[21px]"
            />
          </div>
        ) : null}

        {review.recent_comments.map((comment) => (
          <div key={comment.id} className="mb-1">
            <InlineIdentityText
              username={comment.username ?? "Unknown"}
              isVerified={comment.is_verified}
              body={comment.body}
              usernameClass="text-sm font-bold"
              bodyClass="text-sm leading-[21px]"
            />
          </div>
        ))}
        {review.comments_count > 2 ? (
          <p className="mb-1 text-[13px]" style={{ color: TEXT_MUTED }}>
            View all {review.comments_count} comments
          </p>
        ) : null}

        <div className="mt-[11px] flex items-center gap-[18px] border-t border-[rgba(51,102,84,0.16)] pb-[13px] pt-[11px]">
          <span className="flex min-h-7 items-center gap-1.5">
            <HeartOutline size={24} />
            <span
              className="text-[13.5px] font-semibold tabular-nums"
              style={{ color: TEXT_SECONDARY }}
            >
              {review.likes_count}
            </span>
          </span>
          <span className="flex min-h-7 items-center gap-1.5">
            <ChatOutline size={24} />
            <span
              className="text-[13.5px] font-semibold tabular-nums"
              style={{ color: TEXT_SECONDARY }}
            >
              {review.comments_count}
            </span>
          </span>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this review"
            className="ml-auto cursor-pointer"
          >
            <PaperPlaneOutline size={24} />
          </button>
        </div>
      </div>
    </article>
  );
}

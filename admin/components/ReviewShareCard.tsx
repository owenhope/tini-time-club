"use client";

import { useEffect, useId, useState } from "react";
import {
  formatCityRegion,
  formatRating,
  formatRelativeDate,
  stripNameFromAddress,
} from "@/lib/format";

/**
 * Web replica of the mobile app's ReviewItem (components/ReviewItem.tsx).
 * Layout, colors, and motion mirror the native card: the 0.55 black scrim,
 * the venue block + rating pill, spirit/type attributes, stacked taste and
 * presentation bars that fill over 650ms, the large overall numeral, and the
 * eye toggle that fades the overlay over 300ms. Values come from the app's
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
const BRAND_LAVENDER = "#B6A3E2";
const ACCENT = "#7B60BC"; // lavender600 — verified badge on white
const TEXT = "#17151D"; // neutral900
const TEXT_MUTED = "#6E6A7A"; // neutral500
const OVERLAY = "rgba(0,0,0,0.55)";
const SCRIM = "rgba(0,0,0,0.35)";

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
  <Icon size={size} color={TEXT} label="Likes">
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
  <Icon size={size} color={TEXT} label="Comments">
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
  <Icon size={size} color={TEXT} label="Share">
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

const EyeIcon = ({ size, off }: { size: number; off: boolean }) =>
  off ? (
    <Icon size={size} color="#FFFFFF" label="Show review details">
      <path
        d="M432 448a15.92 15.92 0 0 1-11.31-4.69l-352-352a16 16 0 0 1 22.62-22.62l352 352A16 16 0 0 1 432 448Z"
        fill="currentColor"
      />
      <path
        d="M255.66 384c-41.49 0-81.5-12.28-118.92-36.5-34.07-22-64.74-53.51-88.7-91v-.08c19.94-28.57 41.78-52.73 65.24-72.21a2 2 0 0 0 .14-2.94L93.5 161.38a2 2 0 0 0-2.71-.12c-24.92 21-48.05 46.76-69.08 76.92a31.92 31.92 0 0 0-.64 35.54c26.41 41.33 60.4 76.14 98.28 100.65C162 402 207.9 416 255.66 416a239.13 239.13 0 0 0 75.8-12.58 2 2 0 0 0 .77-3.31l-21.58-21.58a4 4 0 0 0-3.83-1 204.8 204.8 0 0 1-51.16 6.47Z"
        fill="currentColor"
      />
      <path
        d="M490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.66 96a227.34 227.34 0 0 0-74.89 12.83 2 2 0 0 0-.75 3.31l21.55 21.55a4 4 0 0 0 3.88 1 192.82 192.82 0 0 1 50.21-6.69c40.69 0 80.58 12.43 118.55 37 34.71 22.4 65.74 53.88 89.76 91a.13.13 0 0 1 0 .16 310.72 310.72 0 0 1-64.12 72.73 2 2 0 0 0-.15 2.95l19.9 19.89a2 2 0 0 0 2.7.13 343.49 343.49 0 0 0 68.64-78.48 32.2 32.2 0 0 0-.1-34.78Z"
        fill="currentColor"
      />
      <path
        d="M256 160a95.88 95.88 0 0 0-21.37 2.4 2 2 0 0 0-1 3.38l112.59 112.56a2 2 0 0 0 3.38-1A96 96 0 0 0 256 160Z"
        fill="currentColor"
      />
      <path
        d="M165.78 233.66a2 2 0 0 0-3.38 1 96 96 0 0 0 115 115 2 2 0 0 0 1-3.38Z"
        fill="currentColor"
      />
    </Icon>
  ) : (
    <Icon size={size} color="#FFFFFF" label="Hide review details">
      <path
        d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 0 0-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 0 0 0-17.47C428.89 172.28 347.8 112 255.66 112Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="32"
      />
      <circle
        cx="256"
        cy="256"
        r="80"
        fill="none"
        stroke="currentColor"
        strokeWidth="32"
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
      style={{ width: size, height: size, background: ACCENT, fontSize: size * 0.4 }}
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

/** Taste/Presentation bar: fills 0 → score over 650ms ease-out on mount. */
const RatingBar = ({
  label,
  value,
  animate,
}: {
  label: string;
  value: number | null;
  animate: boolean;
}) => {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / 5));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] leading-[18px] text-white/85">
          {label}
        </span>
        <span className="text-[13px] leading-[18px] font-bold text-white tabular-nums">
          {formatRating(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-white"
          style={{
            width: `${(animate ? pct : 0) * 100}%`,
            transition: "width 650ms cubic-bezier(0.215, 0.61, 0.355, 1)",
          }}
        />
      </div>
    </div>
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
  const [overlayVisible, setOverlayVisible] = useState(true);
  // Bars start empty and animate in on the first painted frame, matching the
  // mobile Animated.timing fill.
  const [barsActive, setBarsActive] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setBarsActive(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
        stripNameFromAddress(review.location.name ?? "", review.location.address)
      )
    : "";

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
    <article className="overflow-hidden bg-white sm:rounded-[8px] sm:border sm:border-black/10 sm:shadow-2xl sm:shadow-black/10">
      <style>{`@keyframes ttc-ring-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header — mobile: px 10 / py 12, avatar 28 with rank ring */}
      <div className="flex items-center justify-between bg-white px-[10px] py-3">
        <span className="flex min-w-0 items-center gap-2">
          <AvatarWithRing
            avatarUrl={review.profile?.avatar_public_url ?? null}
            username={review.profile?.username ?? null}
            reviewCount={review.profile?.review_count ?? null}
            size={28}
          />
          <p className="truncate text-[15px] font-bold" style={{ color: TEXT }}>
            {username}
            {review.profile?.is_verified ? (
              <>
                {" "}
                <VerifiedBadge size={13} />
              </>
            ) : null}
          </p>
        </span>
        <span className="p-1">
          <EllipsisIcon size={20} />
        </span>
      </div>

      {/* Photo + overlay */}
      <div className="relative aspect-square bg-[#EEEDF1]">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
        <img
          src={review.image_public_url ?? "/nightlife-martini-table.png"}
          alt={`Review at ${review.location?.name ?? "a Martini spot"}`}
          className="h-full w-full object-cover"
        />

        <div
          className="absolute inset-0 flex flex-col justify-end gap-4 p-5 text-white"
          style={{
            background: OVERLAY,
            opacity: overlayVisible ? 1 : 0,
            transition: "opacity 300ms ease",
            pointerEvents: overlayVisible ? "auto" : "none",
          }}
        >
          {/* Venue block — gap 4 */}
          <div className="flex flex-col gap-1">
            {venueRating != null ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-[13px] leading-[18px] font-bold text-white">
                  {formatRating(venueRating)}
                </span>
                <span className="text-[13px] leading-[18px] text-white/[.78]">
                  {locationReviewCount === 1
                    ? "1 review"
                    : `${locationReviewCount} reviews`}
                </span>
              </p>
            ) : null}
            <h1 className="flex items-center text-[20px] font-bold leading-tight text-white">
              {review.location?.name ?? "Martini review"}
              {" "}
              <ChevronForward size={16} color={BRAND_LAVENDER} />
            </h1>
            {cityRegion ? (
              <p className="text-[13px] text-white">{cityRegion}</p>
            ) : null}
          </div>

          {/* Rating block — full width so Overall sits in the corner */}
          <div className="flex w-full flex-col gap-3">
            <div className="flex gap-6 self-start">
              <div>
                <p className="text-[13px] leading-[18px] text-white/85">
                  Spirit
                </p>
                <p className="text-[17px] font-bold capitalize leading-[22px] text-white">
                  {review.spirit?.name ?? "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[13px] leading-[18px] text-white/85">
                  Type
                </p>
                <p className="text-[17px] font-bold capitalize leading-[22px] text-white">
                  {review.type?.name ?? "N/A"}
                </p>
              </div>
            </div>

            {/* RatingSummary: stacked bars, overall on the right. items-end
                puts the numeral on the same baseline as the last bar, so its
                bottom inset matches the overlay's left and right padding. */}
            <div className="flex items-end gap-[72px]">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <RatingBar
                  label="Taste"
                  value={review.taste}
                  animate={barsActive}
                />
                <RatingBar
                  label="Presentation"
                  value={review.presentation}
                  animate={barsActive}
                />
              </div>
              {overall != null ? (
                <div className="flex shrink-0 flex-col items-start gap-1.5">
                  <p className="text-[13px] leading-[18px] text-white/85">
                    Overall
                  </p>
                  <p className="text-[34px] font-bold leading-[38px] text-white tabular-nums">
                    {formatRating(overall)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Eye toggle — 40x40, radius 20, scrim */}
        <button
          type="button"
          onClick={() => setOverlayVisible((visible) => !visible)}
          aria-label={
            overlayVisible ? "Hide review details" : "Show review details"
          }
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-[20px] shadow-md"
          style={{ background: SCRIM }}
        >
          <EyeIcon size={20} off={!overlayVisible} />
        </button>
      </div>

      {/* Footer — mobile: padding 10 */}
      <div className="bg-white p-[10px]">
        <div className="mb-1 flex items-center gap-2">
          <HeartOutline size={24} />
          <span className="text-[15px] font-bold" style={{ color: TEXT }}>
            {review.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <ChatOutline size={24} />
            {review.comments_count > 0 ? (
              <span className="text-[15px] font-bold" style={{ color: TEXT }}>
                {review.comments_count}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this review"
            className="cursor-pointer"
          >
            <PaperPlaneOutline size={24} />
          </button>
        </div>

        {review.comment ? (
          <div className="mb-1">
            <InlineIdentityText
              username={username}
              isVerified={review.profile?.is_verified}
              body={review.comment}
              usernameClass="text-[15px] font-semibold"
              bodyClass="text-[15px] leading-5"
            />
          </div>
        ) : null}

        {review.recent_comments.map((comment) => (
          <div key={comment.id} className="mb-1">
            <InlineIdentityText
              username={comment.username ?? "Unknown"}
              isVerified={comment.is_verified}
              body={comment.body}
              usernameClass="text-[13px] font-semibold"
              bodyClass="text-[13px] leading-[18px]"
            />
          </div>
        ))}
        {review.comments_count > 2 ? (
          <p className="mb-1 text-[13px]" style={{ color: TEXT_MUTED }}>
            View all {review.comments_count} comments
          </p>
        ) : null}

        <p className="text-[12px]" style={{ color: TEXT_MUTED }}>
          {formatRelativeDate(review.inserted_at)}
        </p>
      </div>
    </article>
  );
}

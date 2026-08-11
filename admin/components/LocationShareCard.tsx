import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatCityRegion,
  formatRating,
  stripNameFromAddress,
} from "@/lib/format";
import type {
  PublicLocation,
  PublicLocationRegular,
} from "@/lib/publicLocation";

const TEXT = "#1C3A2E";
const TEXT_MUTED = "#6E7472";
const HEADER_BRAND = "#6B53A8";
const PAPER = "#FAF9F6";
const SURFACE = "#FFFFFF";
const PIMENTO = "#E8763D";
const OLIVE = "#336654";
const PIP_EMPTY = "#8FB8A8";
const BORDER = "rgba(51,102,84,0.18)";
const INK_PLATE = "rgba(20,26,23,0.72)";
const ACTION_PLATE = "rgba(250,249,246,0.14)";

const reviewOverall = (taste: number | null, presentation: number | null) =>
  taste == null || presentation == null
    ? null
    : Math.round(((taste + presentation) / 2) * 10) / 10;

const reviewLabel = (count: number) =>
  `${count} ${count === 1 ? "review" : "reviews"}`;

const Icon = ({ size, children }: { size: number; children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    aria-hidden
    style={{ color: "#FAF9F6", display: "block" }}
  >
    {children}
  </svg>
);

const ChevronBack = () => (
  <Icon size={20}>
    <path
      d="M328 112 184 256l144 144"
      stroke="currentColor"
      strokeWidth="48"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const PaperPlane = () => (
  <Icon size={19}>
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

const InfoCircle = () => (
  <Icon size={20}>
    <path
      d="M256 56C145.54 56 56 145.54 56 256s89.54 200 200 200 200-89.54 200-200S366.46 56 256 56Z"
      stroke="currentColor"
      strokeWidth="32"
      strokeMiterlimit="10"
    />
    <path
      d="M256 224v144"
      stroke="currentColor"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M256 160h.01" stroke="currentColor" strokeWidth="48" />
  </Icon>
);

const MapOutline = () => (
  <Icon size={20}>
    <path
      d="M313.27 48 198.73 96 56 48v368l142.73 48 114.54-48L456 464V96L313.27 48Z"
      stroke="currentColor"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M313.27 48v368M198.73 96v368"
      stroke="currentColor"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

const HeaderControl = ({ children }: { children: ReactNode }) => (
  <span
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
    style={{ background: ACTION_PLATE }}
  >
    {children}
  </span>
);

const OlivePip = ({ size = 13 }: { size?: number }) => (
  <span
    className="relative block shrink-0 rounded-[50%]"
    style={{
      width: size * 0.84,
      height: size,
      background: OLIVE,
    }}
  >
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
  </span>
);

const RatingPips = ({ value }: { value: number | null }) => {
  const clamped = Math.max(0, Math.min(value ?? 0, 5));

  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, clamped - index));
        return fill > 0 ? (
          <span key={index} className="opacity-100" style={{ opacity: fill }}>
            <OlivePip size={14} />
          </span>
        ) : (
          <span
            key={index}
            className="block shrink-0 rounded-[50%]"
            style={{
              width: 11.8,
              height: 14,
              border: `2px solid ${PIP_EMPTY}`,
            }}
          />
        );
      })}
    </span>
  );
};

const RegularAvatar = ({ regular }: { regular: PublicLocationRegular }) => {
  const initial = regular.username.trim().charAt(0).toUpperCase() || "M";

  return (
    <span
      className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#D9D1FB] bg-[#2B2142] text-sm font-bold text-[#D9D1FB] shadow-[0_0_0_1px_rgba(250,249,246,0.7)]"
      title={regular.username}
    >
      {regular.avatar_public_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={regular.avatar_public_url}
          alt={regular.username}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
};

export default function LocationShareCard({
  location,
}: {
  location: PublicLocation;
}) {
  const cityRegion = location.address
    ? formatCityRegion(stripNameFromAddress(location.name, location.address))
    : null;
  const hasRating = location.rating != null && location.total_ratings > 0;
  const hasCoordinates = location.lat != null && location.lon != null;

  return (
    <article
      className="overflow-hidden rounded-[8px] border shadow-[0_4px_14px_rgba(28,58,46,0.08)]"
      style={{ borderColor: BORDER, background: SURFACE, color: TEXT }}
    >
      <section className="text-white" style={{ background: HEADER_BRAND }}>
        <div className="flex items-center justify-between gap-3 px-[10px] pb-4 pt-3">
          <HeaderControl>
            <ChevronBack />
          </HeaderControl>
          <div className="flex items-center gap-[9px]">
            <HeaderControl>
              <PaperPlane />
            </HeaderControl>
            <HeaderControl>
              <InfoCircle />
            </HeaderControl>
            {hasCoordinates ? (
              <HeaderControl>
                <MapOutline />
              </HeaderControl>
            ) : null}
          </div>
        </div>

        <div className="px-[10px] pb-[18px]">
          <h1 className="text-[27px] leading-[30px] font-black">
            {location.name}
          </h1>
          {cityRegion ? (
            <p className="mt-[5px] truncate font-mono text-[12px] text-white/85">
              {cityRegion}
            </p>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-6 px-[10px] pb-6">
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-bold tracking-[1.4px] uppercase">
              Overall
            </p>
            <div className="flex items-center gap-3">
              <p className="text-[44px] leading-[46px] font-black tabular-nums">
                {hasRating ? formatRating(location.rating) : "--"}
              </p>
              {hasRating ? (
                <span className="rounded-[10px] bg-white/10 px-2 py-1.5">
                  <RatingPips value={location.rating} />
                </span>
              ) : null}
            </div>
            <p className="font-mono text-[14px]">
              {reviewLabel(location.total_ratings)}
            </p>
          </div>

          {location.regulars.length > 0 ? (
            <div className="flex shrink-0 flex-col items-end gap-3 pt-0.5">
              <p className="text-[10px] font-bold tracking-[1.4px] uppercase">
                Regulars
              </p>
              <div className="flex items-center pr-1">
                {location.regulars.map((regular, index) => (
                  <span
                    key={`${regular.username}-${regular.rank}`}
                    className={index > 0 ? "-ml-2" : undefined}
                  >
                    <RegularAvatar regular={regular} />
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-[10px] pb-4 pt-5" style={{ background: SURFACE }}>
        <p
          className="text-[11px] font-bold tracking-[1.4px] uppercase"
          style={{ color: OLIVE }}
        >
          {location.total_ratings > 0
            ? reviewLabel(location.total_ratings)
            : "The record"}
        </p>
        <h2 className="mt-1 text-[28px] leading-8 font-black">Reviews</h2>
      </section>

      {location.reviews.length > 0 ? (
        <div
          className="grid grid-cols-3 gap-[2px]"
          style={{ background: SURFACE }}
        >
          {location.reviews.map((review) => {
            const overall = reviewOverall(review.taste, review.presentation);
            return (
              <Link
                key={review.id}
                href={`/r/${encodeURIComponent(review.id)}`}
                aria-label={`Review by ${review.profile?.username ?? "a member"}${
                  overall == null ? "" : `, overall ${formatRating(overall)}`
                }`}
                className="relative aspect-square overflow-hidden"
                style={{ background: "#E5E6E8" }}
              >
                {review.image_public_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.image_public_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}

                {overall != null ? (
                  <span
                    className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full px-1.5 py-1 text-[12px] leading-4 font-bold text-white tabular-nums"
                    style={{ background: INK_PLATE }}
                  >
                    <OlivePip size={11} />
                    {formatRating(overall)}
                  </span>
                ) : null}

                {review.profile?.username ? (
                  <span
                    className="absolute bottom-1.5 left-1.5 max-w-[88%] truncate rounded-[4px] px-1.5 py-1 text-[11px] leading-4 text-white"
                    style={{ background: INK_PLATE }}
                  >
                    {review.profile.username}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <p
          className="px-5 pb-10 text-center text-sm"
          style={{ background: SURFACE, color: TEXT_MUTED }}
        >
          Nobody&apos;s given a verdict here yet. Be first.
        </p>
      )}

      <div className="h-3" style={{ background: PAPER }} />
    </article>
  );
}

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

const reviewOverall = (taste: number | null, presentation: number | null) =>
  taste == null || presentation == null
    ? null
    : Math.round(((taste + presentation) / 2) * 10) / 10;

const reviewLabel = (count: number) =>
  `${count} ${count === 1 ? "review" : "reviews"}`;

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
  return (
    <article
      className="overflow-hidden rounded-[22px] border shadow-[0_4px_14px_rgba(28,58,46,0.08)]"
      style={{ borderColor: BORDER, background: SURFACE, color: TEXT }}
    >
      <section className="text-white" style={{ background: HEADER_BRAND }}>
        <div className="px-[10px] pb-[18px] pt-5">
          <h1 className="text-[26px] leading-[29px] font-black">
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
              <div
                key={review.id}
                role="img"
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
              </div>
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

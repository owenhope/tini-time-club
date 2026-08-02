import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { fetchSharePreviewProfiles, fetchSharePreviewReviews } from "@/lib/data";

export const dynamic = "force-dynamic";

const PUBLIC_ORIGIN = "https://tinitimeclub.com";
const PREVIEW_MODES = {
  mobile: { label: "Mobile", width: 390, height: 844 },
  desktop: { label: "Desktop", width: 1040, height: 680 },
} as const;
const SHARE_KINDS = {
  review: { label: "Review", noun: "review" },
  profile: { label: "Profile", noun: "profile" },
} as const;

type PreviewMode = keyof typeof PREVIEW_MODES;
type ShareKind = keyof typeof SHARE_KINDS;

const Frame = ({
  title,
  width,
  height,
  src,
}: {
  title: string;
  width: number;
  height: number;
  src: string;
}) => (
  <section>
    <div className="mb-2 flex items-center justify-between">
      <h2 className="font-semibold">{title}</h2>
      <span className="text-xs font-medium text-stone-400">
        {width} x {height}
      </span>
    </div>
    <div className="overflow-auto rounded-2xl border border-stone-200 bg-stone-100 p-4">
      <iframe
        title={`${title} public share page preview`}
        src={src}
        width={width}
        height={height}
        className="mx-auto rounded-[8px] border border-stone-300 bg-white shadow-sm"
      />
    </div>
  </section>
);

export default async function SharePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    review?: string;
    username?: string;
    kind?: string;
    mode?: string;
  }>;
}) {
  const params = await searchParams;
  const kind: ShareKind = params.kind === "profile" ? "profile" : "review";
  const mode: PreviewMode =
    params.mode === "desktop" || params.mode === "mobile"
      ? params.mode
      : "mobile";
  const frame = PREVIEW_MODES[mode];

  // Only the selected kind's picker is rendered, so only it needs data.
  const [reviews, profiles] = await Promise.all([
    kind === "review" ? fetchSharePreviewReviews() : [],
    kind === "profile" ? fetchSharePreviewProfiles() : [],
  ]);

  const selectedReviewId = params.review ?? reviews[0]?.id ?? "";
  const selectedUsername = params.username ?? profiles[0]?.username ?? "";
  const target = kind === "review" ? selectedReviewId : selectedUsername;
  const publicPath =
    kind === "review"
      ? `/r/${encodeURIComponent(target)}`
      : `/u/${encodeURIComponent(target)}`;
  const previewPath = target ? `${publicPath}?preview=admin` : "";
  const publicUrl = target ? `${PUBLIC_ORIGIN}${publicPath}` : "";

  // Both selections survive a kind or mode switch, so toggling back and forth
  // returns to what you were looking at.
  const hrefWith = (next: { kind?: ShareKind; mode?: PreviewMode }) =>
    `/admin/share-preview?${new URLSearchParams({
      ...(selectedReviewId ? { review: selectedReviewId } : {}),
      ...(selectedUsername ? { username: selectedUsername } : {}),
      kind: next.kind ?? kind,
      mode: next.mode ?? mode,
    })}`;

  return (
    <AdminShell active="share-preview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Share preview</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Preview the public {SHARE_KINDS[kind].noun} page at desktop and
            mobile sizes.
          </p>
        </div>
        {publicUrl ? (
          <Link
            href={publicUrl}
            target="_blank"
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Open public page
          </Link>
        ) : null}
      </div>

      <div className="mt-4 inline-flex rounded-xl border border-stone-200 bg-white p-1">
        {(Object.keys(SHARE_KINDS) as ShareKind[]).map((key) => (
          <Link
            key={key}
            href={hrefWith({ kind: key })}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              kind === key
                ? "bg-emerald-900 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {SHARE_KINDS[key].label}
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          {kind === "review" ? (
            <>
              <form className="flex items-end gap-2">
                <input type="hidden" name="kind" value="review" />
                <input type="hidden" name="mode" value={mode} />
                {/* Carried so switching back to Profile keeps its selection. */}
                {selectedUsername ? (
                  <input
                    type="hidden"
                    name="username"
                    value={selectedUsername}
                  />
                ) : null}
                <label className="block text-sm font-medium text-stone-700">
                  Review
                  <select
                    name="review"
                    defaultValue={selectedReviewId}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  >
                    {reviews.map((review) => (
                      <option key={review.id} value={review.id}>
                        #{review.id} ·{" "}
                        {review.location?.name ?? "Unknown location"} · @
                        {review.profile?.username ?? "unknown"} ·{" "}
                        {new Date(review.inserted_at).toLocaleDateString()}
                      </option>
                    ))}
                    {selectedReviewId &&
                    !reviews.some((r) => r.id === selectedReviewId) ? (
                      <option value={selectedReviewId}>
                        #{selectedReviewId}
                      </option>
                    ) : null}
                  </select>
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Preview
                </button>
              </form>
              <form className="flex items-end gap-2">
                <input type="hidden" name="kind" value="review" />
                <input type="hidden" name="mode" value={mode} />
                {/* Carried so switching back to Profile keeps its selection. */}
                {selectedUsername ? (
                  <input
                    type="hidden"
                    name="username"
                    value={selectedUsername}
                  />
                ) : null}
                <label className="block text-sm font-medium text-stone-700">
                  Or review ID
                  <div className="mt-1 flex gap-2">
                    <input
                      name="review"
                      defaultValue={selectedReviewId}
                      placeholder="123"
                      className="w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Preview
                    </button>
                  </div>
                </label>
              </form>
            </>
          ) : (
            <>
              <form className="flex items-end gap-2">
                <input type="hidden" name="kind" value="profile" />
                <input type="hidden" name="mode" value={mode} />
                {selectedReviewId ? (
                  <input
                    type="hidden"
                    name="review"
                    value={selectedReviewId}
                  />
                ) : null}
                <label className="block text-sm font-medium text-stone-700">
                  Member
                  <select
                    name="username"
                    defaultValue={selectedUsername}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  >
                    {profiles.map((profile) => (
                      <option key={profile.username} value={profile.username}>
                        @{profile.username}
                        {profile.name ? ` · ${profile.name}` : ""} ·{" "}
                        {profile.review_count ?? 0}{" "}
                        {profile.review_count === 1 ? "review" : "reviews"}
                      </option>
                    ))}
                    {selectedUsername &&
                    !profiles.some((p) => p.username === selectedUsername) ? (
                      <option value={selectedUsername}>
                        @{selectedUsername}
                      </option>
                    ) : null}
                  </select>
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Preview
                </button>
              </form>
              <form className="flex items-end gap-2">
                <input type="hidden" name="kind" value="profile" />
                <input type="hidden" name="mode" value={mode} />
                {selectedReviewId ? (
                  <input
                    type="hidden"
                    name="review"
                    value={selectedReviewId}
                  />
                ) : null}
                <label className="block text-sm font-medium text-stone-700">
                  Or username
                  <div className="mt-1 flex gap-2">
                    <input
                      name="username"
                      defaultValue={selectedUsername}
                      placeholder="martinifan"
                      className="w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Preview
                    </button>
                  </div>
                </label>
              </form>
            </>
          )}
        </div>
        {publicUrl ? (
          <p className="mt-3 break-all text-xs text-stone-400">{publicUrl}</p>
        ) : (
          <p className="mt-3 text-sm text-stone-400">
            {kind === "review"
              ? "No active reviews are available to preview yet."
              : "No members are available to preview yet."}
          </p>
        )}
      </div>

      {previewPath ? (
        <div className="mt-6">
          <div className="mb-4 inline-flex rounded-xl border border-stone-200 bg-white p-1">
            {(Object.keys(PREVIEW_MODES) as PreviewMode[]).map((key) => (
              <Link
                key={key}
                href={hrefWith({ mode: key })}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === key
                    ? "bg-emerald-900 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {PREVIEW_MODES[key].label}
              </Link>
            ))}
          </div>
          <Frame
            title={frame.label}
            width={frame.width}
            height={frame.height}
            src={previewPath}
          />
        </div>
      ) : null}
    </AdminShell>
  );
}

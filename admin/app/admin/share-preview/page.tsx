import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { ActionLink, PageHeader } from "@/components/AdminPrimitives";
import { fetchSharePreviewReviews } from "@/lib/data";

export const dynamic = "force-dynamic";

const PUBLIC_ORIGIN = "https://tinitimeclub.com";
const PREVIEW_MODES = {
  mobile: { label: "Mobile", width: 390, height: 844 },
  desktop: { label: "Desktop", width: 1040, height: 680 },
} as const;

type PreviewMode = keyof typeof PREVIEW_MODES;

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
    <div className="overflow-auto rounded-lg border border-stone-200 bg-stone-100 p-4">
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
  searchParams: Promise<{ review?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const reviews = await fetchSharePreviewReviews();
  const selectedReviewId = params.review ?? reviews[0]?.id ?? "";
  const mode: PreviewMode =
    params.mode === "desktop" || params.mode === "mobile"
      ? params.mode
      : "mobile";
  const frame = PREVIEW_MODES[mode];
  const previewPath = selectedReviewId
    ? `/r/${encodeURIComponent(selectedReviewId)}?preview=admin`
    : "";
  const publicUrl = selectedReviewId
    ? `${PUBLIC_ORIGIN}/r/${encodeURIComponent(selectedReviewId)}`
    : "";
  const tabHref = (nextMode: PreviewMode) =>
    `/admin/share-preview?${new URLSearchParams({
      ...(selectedReviewId ? { review: selectedReviewId } : {}),
      mode: nextMode,
    })}`;

  return (
    <AdminShell active="share-preview">
      <PageHeader
        eyebrow="Secondary tool"
        title="Share preview"
        description="Preview the public review page at desktop and mobile sizes."
        surface="transparent"
        density="compact"
        actions={
          publicUrl ? (
            <ActionLink href={publicUrl} external>
              Open public page
            </ActionLink>
          ) : null
        }
      />

      <div className="space-y-6 px-8 py-6">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <form className="flex items-end gap-2">
              <input type="hidden" name="mode" value={mode} />
              <label className="block text-sm font-medium text-stone-700">
                Review
                <select
                  name="review"
                  defaultValue={selectedReviewId}
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
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
                className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
              >
                Preview
              </button>
            </form>
            <form className="flex items-end gap-2">
              <input type="hidden" name="mode" value={mode} />
              <label className="block text-sm font-medium text-stone-700">
                Or review ID
                <div className="mt-1 flex gap-2">
                  <input
                    name="review"
                    defaultValue={selectedReviewId}
                    placeholder="123"
                    className="w-32 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    Preview
                  </button>
                </div>
              </label>
            </form>
          </div>
          {publicUrl ? (
            <p className="mt-3 break-all text-xs text-stone-400">{publicUrl}</p>
          ) : (
            <p className="mt-3 text-sm text-stone-400">
              No active reviews are available to preview yet.
            </p>
          )}
        </div>

        {previewPath ? (
          <div>
            <div className="mb-4 inline-flex rounded-lg border border-stone-200 bg-white p-1">
              {(Object.keys(PREVIEW_MODES) as PreviewMode[]).map((key) => {
                const active = mode === key;
                return (
                  <Link
                    key={key}
                    href={tabHref(key)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-emerald-900 text-white"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {PREVIEW_MODES[key].label}
                  </Link>
                );
              })}
            </div>
            <Frame
              title={frame.label}
              width={frame.width}
              height={frame.height}
              src={previewPath}
            />
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

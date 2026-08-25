import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import {
  ActionLink,
  PageHeader,
  Panel,
  StatusPill,
} from "@/components/AdminPrimitives";
import UserBadge from "@/components/UserBadge";
import MentionRichText from "@/components/MentionRichText";
import { setReviewActive } from "@/lib/actions";
import { fetchAdminReview } from "@/lib/reviewData";

export const dynamic = "force-dynamic";

const date = (value: string) => new Date(value).toLocaleString();

const score = (value: number | null) => value?.toFixed(1) ?? "—";

const overall = (taste: number | null, presentation: number | null) =>
  taste == null || presentation == null
    ? "—"
    : (Math.round(((taste + presentation) / 2) * 10) / 10).toFixed(1);

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await fetchAdminReview(id);
  if (!review) notFound();

  const active = review.state === 1;
  const toggleActive = setReviewActive.bind(null, review.id, !active);
  const totalEngagement =
    review.engagement.likes +
    review.engagement.comments +
    review.engagement.shares;

  return (
    <AdminShell active="reviews">
      <PageHeader
        backLink={{ href: "/admin/reviews", label: "Back to reviews" }}
        eyebrow="Review management"
        title={review.location?.name ?? `Review #${review.id}`}
        description={`Posted ${date(review.inserted_at)}`}
        stats={[
          {
            label: "Overall Rating",
            value: overall(review.taste, review.presentation),
            tone: "chartreuse",
          },
          { label: "Taste", value: score(review.taste), tone: "chartreuse" },
          {
            label: "Presentation",
            value: score(review.presentation),
            tone: "blue",
          },
          {
            label: "State",
            value: active ? "Active" : "Inactive",
            tone: active ? "green" : "muted",
          },
          { label: "Engagement", value: totalEngagement, tone: "green" },
          { label: "Likes", value: review.engagement.likes, tone: "muted" },
          {
            label: "Comments",
            value: review.engagement.comments,
            tone: "muted",
          },
          { label: "Shares", value: review.engagement.shares, tone: "muted" },
        ]}
        surface="transparent"
        density="compact"
        actions={
          <div className="flex items-center gap-2">
            <ActionLink href={`/r/${encodeURIComponent(review.id)}`} external>
              View public
            </ActionLink>
            <form action={toggleActive}>
              <button
                type="submit"
                className={`h-8 rounded-md px-3 text-xs font-bold text-white transition ${
                  active
                    ? "bg-red-700 hover:bg-red-600"
                    : "bg-emerald-900 hover:bg-emerald-800"
                }`}
              >
                {active ? "Deactivate review" : "Restore review"}
              </button>
            </form>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5 px-8 py-6">
        <Panel title="Member" className="col-span-12 xl:col-span-4">
          <div className="space-y-4 p-4">
            {review.profile ? (
              <Link
                href={`/admin/users/${review.profile.id}`}
                className="block hover:opacity-80"
              >
                <UserBadge profile={review.profile} />
              </Link>
            ) : (
              <p className="text-sm text-stone-400">Member unavailable</p>
            )}
            <div>
              {active ? (
                <StatusPill tone="green">Active review</StatusPill>
              ) : (
                <StatusPill>Inactive review</StatusPill>
              )}
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Review id
                </dt>
                <dd className="mt-1 font-mono text-stone-700">{review.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Spirit
                </dt>
                <dd className="mt-1 text-stone-900">
                  {review.spirit?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Type
                </dt>
                <dd className="mt-1 text-stone-900">
                  {review.type?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Place
                </dt>
                <dd className="mt-1 text-stone-900">
                  {review.location?.address ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        </Panel>

        <Panel title="Review content" className="col-span-12 xl:col-span-8">
          <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                Caption
              </p>
              <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-stone-900">
                {review.comment ? (
                  <MentionRichText
                    text={review.comment}
                    mentions={review.mentions}
                  />
                ) : (
                  "No caption."
                )}
              </p>
            </div>
            {review.image_public_url ? (
              <div
                role="img"
                aria-label="Review image"
                className="aspect-square w-full bg-stone-100 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${review.image_public_url}")`,
                }}
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-stone-100 text-sm text-stone-400">
                No image
              </div>
            )}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}

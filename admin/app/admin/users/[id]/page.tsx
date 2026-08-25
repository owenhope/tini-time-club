import { notFound } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import ClickableRow from "@/components/ClickableRow";
import {
  ActionLink,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  StatusPill,
} from "@/components/AdminPrimitives";
import UserBadge, { tierFor } from "@/components/UserBadge";
import { formatOverallRating } from "@/lib/format";
import { fetchProfile } from "@/lib/profileData";
import { setDeleted, setVerified } from "@/lib/actions";

export const dynamic = "force-dynamic";

const date = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchProfile(id);
  if (!result) notFound();
  const { profile, reviews } = result;
  const tier = tierFor(profile.review_count);

  const toggleVerified = setVerified.bind(
    null,
    profile.id,
    !profile.is_verified
  );
  const toggleDeleted = setDeleted.bind(null, profile.id, !profile.deleted);

  return (
    <AdminShell active="users">
      <PageHeader
        backLink={{ href: "/admin/users", label: "Back to members" }}
        eyebrow="User dossier"
        title={profile.username ?? "Unknown member"}
        description={profile.bio ?? "No profile bio."}
        stats={[
          { label: "Rank", value: tier.name, tone: "purple" },
          {
            label: "Reviews",
            value: profile.review_count ?? 0,
            tone: "green",
          },
          { label: "Joined", value: date(profile.created_at), tone: "muted" },
          {
            label: "Last sign-in",
            value: date(profile.last_sign_in_at),
            tone: "muted",
          },
        ]}
        surface="transparent"
        density="compact"
        actions={
          <div className="flex gap-2">
            <form action={toggleVerified}>
              <button
                type="submit"
                className="h-9 rounded-md border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-violet-300 hover:text-violet-700"
              >
                {profile.is_verified ? "Remove verification" : "Verify"}
              </button>
            </form>
            <form action={toggleDeleted}>
              <button
                type="submit"
                className={`h-9 rounded-md px-3 text-xs font-bold text-white transition ${
                  profile.deleted
                    ? "bg-emerald-900 hover:bg-emerald-800"
                    : "bg-red-700 hover:bg-red-600"
                }`}
              >
                {profile.deleted ? "Restore account" : "Soft-delete account"}
              </button>
            </form>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5 px-8 py-6">
        <Panel title="Member summary" className="col-span-12 xl:col-span-3">
          <div className="space-y-5 p-4">
            <UserBadge profile={profile} />
            <div className="flex flex-wrap gap-1.5">
              {profile.deleted ? (
                <StatusPill tone="red">Deleted</StatusPill>
              ) : (
                <StatusPill tone="green">Active</StatusPill>
              )}
              {profile.is_verified ? (
                <StatusPill tone="purple">Verified</StatusPill>
              ) : null}
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Name
                </dt>
                <dd className="mt-1 text-stone-900">{profile.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Email
                </dt>
                <dd className="mt-1 break-all text-stone-900">
                  {profile.email ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Id
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-stone-500">
                  {profile.id}
                </dd>
              </div>
              {profile.deleted_at ? (
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                    Deleted
                  </dt>
                  <dd className="mt-1 text-stone-900">
                    {date(profile.deleted_at)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </Panel>

        <div className="col-span-12 xl:col-span-9">
          <DataTable
            columns={[
              "Posted",
              "Place",
              "Rating",
              "Caption",
              "State",
              "Actions",
            ]}
            empty={
              reviews.length === 0 ? (
                <EmptyState>No reviews yet.</EmptyState>
              ) : null
            }
          >
            {reviews.map((review) => (
              <ClickableRow
                key={review.id}
                href={`/admin/reviews/${review.id}`}
                className="cursor-pointer hover:bg-stone-50 focus:bg-stone-50 focus:outline-none"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-500">
                  {date(review.inserted_at)}
                </td>
                <td className="max-w-52 truncate px-4 py-3 font-bold text-stone-900">
                  {review.location?.name ?? "Unknown place"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="font-mono text-base font-semibold tabular-nums">
                    {formatOverallRating(review.taste, review.presentation)}
                  </span>
                  <span className="ml-2 text-xs text-stone-400">
                    T {review.taste ?? "—"} / P {review.presentation ?? "—"}
                  </span>
                </td>
                <td className="max-w-0 px-4 py-3 text-stone-500">
                  <div className="truncate" title={review.comment ?? ""}>
                    {review.comment ?? ""}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {review.state === 1 ? (
                    <StatusPill tone="green">Active</StatusPill>
                  ) : (
                    <StatusPill>Inactive</StatusPill>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <ActionLink href={`/admin/reviews/${review.id}`}>
                    Manage
                  </ActionLink>
                </td>
              </ClickableRow>
            ))}
          </DataTable>
        </div>
      </div>
    </AdminShell>
  );
}

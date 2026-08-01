import { notFound } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import UserBadge from "@/components/UserBadge";
import { fetchProfile } from "@/lib/data";
import { setDeleted, setVerified } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchProfile(id);
  if (!result) notFound();
  const { profile, reviews } = result;

  const toggleVerified = setVerified.bind(
    null,
    profile.id,
    !profile.is_verified
  );
  const toggleDeleted = setDeleted.bind(null, profile.id, !profile.deleted);

  return (
    <AdminShell active="users">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <UserBadge profile={profile} />
          {profile.name ? (
            <p className="mt-2 text-sm text-stone-600">{profile.name}</p>
          ) : null}
          {profile.bio ? (
            <p className="mt-1 max-w-lg text-sm text-stone-500">
              {profile.bio}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-stone-400">
            id {profile.id}
            {profile.created_at
              ? ` · joined ${new Date(profile.created_at).toLocaleDateString()}`
              : ""}
            {profile.deleted_at
              ? ` · deleted ${new Date(profile.deleted_at).toLocaleDateString()}`
              : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <form action={toggleVerified}>
            <button
              type="submit"
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-stone-100"
            >
              {profile.is_verified ? "Remove verification" : "Verify"}
            </button>
          </form>
          <form action={toggleDeleted}>
            <button
              type="submit"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${
                profile.deleted
                  ? "bg-emerald-700 hover:bg-emerald-600"
                  : "bg-red-700 hover:bg-red-600"
              }`}
            >
              {profile.deleted ? "Restore account" : "Soft-delete account"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-200 px-5 py-3 font-semibold">
          Reviews ({reviews.length})
        </h2>
        <ul className="divide-y divide-stone-100">
          {reviews.map((review: any) => (
            <li key={review.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {review.location?.name ?? "Unknown location"}
                </span>
                <span className="text-sm text-stone-500">
                  {new Date(review.inserted_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-stone-600">
                taste {review.taste}/5 · presentation {review.presentation}/5
                {review.state !== 1 ? " · (removed)" : ""}
              </p>
              {review.comment ? (
                <p className="mt-1 text-sm text-stone-500">
                  “{review.comment}”
                </p>
              ) : null}
            </li>
          ))}
          {reviews.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-stone-400">
              No reviews yet.
            </li>
          )}
        </ul>
      </div>
    </AdminShell>
  );
}

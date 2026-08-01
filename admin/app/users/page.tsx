import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import UserBadge from "@/components/UserBadge";
import { fetchProfiles, USERS_PAGE_SIZE } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { profiles, total } = await fetchProfiles(q, page);
  const totalPages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const pageUrl = (p: number) =>
    `/users?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

  return (
    <AdminShell active="users">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight">Users</h1>
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search usernames…"
            className="w-64 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Search
          </button>
        </form>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Last sign-in</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {profiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-stone-50">
                <td className="px-5 py-3">
                  <UserBadge profile={profile} />
                </td>
                <td className="px-5 py-3 text-stone-500">
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-5 py-3 text-stone-500">
                  {profile.last_sign_in_at
                    ? new Date(profile.last_sign_in_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/users/${profile.id}`}
                    className="font-medium text-violet-600 hover:text-violet-800"
                  >
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-stone-400">
                  No users match “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-stone-500">
        <span>
          {total.toLocaleString()} member{total === 1 ? "" : "s"} · page {page}{" "}
          of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={pageUrl(page - 1)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-600 hover:bg-stone-100"
            >
              ← Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={pageUrl(page + 1)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-600 hover:bg-stone-100"
            >
              Next →
            </Link>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}

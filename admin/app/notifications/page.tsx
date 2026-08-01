import AdminShell from "@/components/AdminShell";
import {
  fetchProfiles,
  fetchPushTokenCount,
  fetchRecentNotifications,
} from "@/lib/data";
import { sendNotification } from "@/lib/actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  body: "Message is required and must be under 180 characters.",
  url: "Link must be an in-app path starting with “/”.",
  audience: "Nobody matched that audience.",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const [profiles, notifications, tokenCount] = await Promise.all([
    fetchProfiles(),
    fetchRecentNotifications(),
    fetchPushTokenCount(),
  ]);
  const members = profiles.filter((p) => !p.deleted);

  return (
    <AdminShell active="notifications">
      <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
      <p className="mt-0.5 text-sm text-stone-500">
        Delivered as a push (when the member has one registered — {tokenCount}{" "}
        device{tokenCount === 1 ? "" : "s"} currently) and into their in-app
        notification list.
      </p>

      {sent ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Sent to {sent} member{sent === "1" ? "" : "s"}.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERRORS[error] ?? "Something went wrong."}
        </p>
      ) : null}

      <form
        action={sendNotification}
        className="mt-4 rounded-2xl border border-stone-200 bg-white p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-stone-700">
            Audience
            <select
              name="audience"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            >
              <option value="all">All members ({members.length})</option>
              {members.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.username ?? profile.email ?? profile.id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Link (optional, in-app path)
            <input
              type="text"
              name="url"
              placeholder="/places/8"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-stone-700">
          Message
          <textarea
            name="body"
            required
            maxLength={180}
            rows={3}
            placeholder="Happy hour intel, feature news, a nudge…"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Send notification
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-200 px-5 py-3 font-semibold">
          Recent notifications
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-5 py-2.5">To</th>
              <th className="px-5 py-2.5">Message</th>
              <th className="px-5 py-2.5">Kind</th>
              <th className="px-5 py-2.5">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {notifications.map((n) => (
              <tr key={n.id}>
                <td className="px-5 py-2.5 font-medium">
                  {n.username ?? "—"}
                </td>
                <td className="px-5 py-2.5 text-stone-600">{n.body}</td>
                <td className="px-5 py-2.5">
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                    {n.kind ?? "?"}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-stone-500">
                  {new Date(n.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {notifications.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-stone-400">
                  Nothing sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

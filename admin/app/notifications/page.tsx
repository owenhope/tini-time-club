import AdminShell from "@/components/AdminShell";
import Pagination, { parsePerPage } from "@/components/Pagination";
import {
  fetchNotificationAnalytics,
  fetchProfiles,
  fetchPushTokenCount,
  fetchRecentNotifications,
} from "@/lib/data";
import { sendNotification } from "@/lib/actions";
import {
  reminderForDate,
  upcomingFridays,
  SEASONAL_REMINDERS,
} from "@/lib/reminders";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  body: "Message is required and must be under 180 characters.",
  url: "Link must be an in-app path starting with “/”.",
  audience: "Nobody matched that audience.",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sent?: string;
    error?: string;
    rpage?: string;
    rper?: string;
    upage?: string;
    uper?: string;
  }>;
}) {
  const params = await searchParams;
  const { sent, error } = params;
  const rPage = Math.max(1, Number(params.rpage) || 1);
  const rPer = parsePerPage(params.rper);
  const uPage = Math.max(1, Number(params.upage) || 1);
  const uPer = parsePerPage(params.uper);

  const [profilePage, recent, tokenCount, analytics] = await Promise.all([
    // The audience dropdown wants everyone; bump the page size well past
    // the member count until that stops being reasonable.
    fetchProfiles(undefined, 1, 500),
    fetchRecentNotifications(rPage, rPer),
    fetchPushTokenCount(),
    fetchNotificationAnalytics(30),
  ]);
  const members = profilePage.profiles.filter((p) => !p.deleted);
  const notifications = recent.notifications;

  const pct = (n: number | null) =>
    n == null ? "—" : `${Math.round(n * 100)}%`;
  const allFridays = upcomingFridays(new Date(), 52, 16);
  const fridays = allFridays.slice((uPage - 1) * uPer, uPage * uPer);
  const seasonalMessages = new Set(
    SEASONAL_REMINDERS.map((rule) => rule.message.title)
  );
  // Each table's pagination links carry the other's params along.
  const upcomingBase = `rpage=${rPage}&rper=${rPer}`;
  const recentBase = `upage=${uPage}&uper=${uPer}`;

  return (
    <AdminShell active="notifications">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Delivered as a push (when the member has one registered —{" "}
            {tokenCount} device{tokenCount === 1 ? "" : "s"} currently) and
            into their in-app notification list.
          </p>
        </div>
        <details className="relative" open={Boolean(sent) || Boolean(error)}>
          <summary className="cursor-pointer list-none rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 [&::-webkit-details-marker]:hidden">
            + Send notification
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-[26rem] max-w-[90vw] rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
            <form action={sendNotification}>
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
              <label className="mt-3 block text-sm font-medium text-stone-700">
                Link (optional, in-app path)
                <input
                  type="text"
                  name="url"
                  placeholder="/places/8"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-stone-700">
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
                className="mt-4 w-full rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Send
              </button>
            </form>
          </div>
        </details>
      </div>

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

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Sent (30d)</p>
          <p className="mt-1 text-2xl font-bold">{analytics.totalSent}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Opens (30d)</p>
          <p className="mt-1 text-2xl font-bold">{analytics.totalOpened}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Open rate</p>
          <p className="mt-1 text-2xl font-bold">
            {pct(
              analytics.totalSent > 0
                ? analytics.totalOpened / analytics.totalSent
                : null
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Open → review (24h)</p>
          <p className="mt-1 text-2xl font-bold">
            {pct(analytics.openToReviewRate)}
          </p>
        </div>
      </div>

      {analytics.byKind.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-5 py-2.5">Kind</th>
                <th className="px-5 py-2.5">Sent (30d)</th>
                <th className="px-5 py-2.5">Opened</th>
                <th className="px-5 py-2.5">Open rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {analytics.byKind.map((row) => (
                <tr key={row.kind}>
                  <td className="px-5 py-2.5 font-medium">{row.kind}</td>
                  <td className="px-5 py-2.5">
                    {row.kind === "tini_time_reminder"
                      ? "local (per device)"
                      : row.sent}
                  </td>
                  <td className="px-5 py-2.5">{row.opened}</td>
                  <td className="px-5 py-2.5">{pct(row.openRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-200 px-5 py-3 font-semibold">
          Upcoming Tini Time reminders{" "}
          <span className="font-normal text-stone-400">
            (Fridays 4pm, member-local time)
          </span>
        </h2>
        <div>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-stone-100">
              {fridays.map((friday) => {
                const message = reminderForDate(friday);
                const seasonal = seasonalMessages.has(message.title);
                return (
                  <tr key={friday.toISOString()}>
                    <td className="w-32 px-5 py-2.5 whitespace-nowrap text-stone-500">
                      {friday.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="font-medium">{message.title}</span>{" "}
                      <span className="text-stone-500">{message.body}</span>
                    </td>
                    <td className="w-24 px-5 py-2.5">
                      {seasonal ? (
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
                          seasonal
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          path="/notifications"
          baseQuery={upcomingBase}
          pageParam="upage"
          perParam="uper"
          page={uPage}
          perPage={uPer}
          total={allFridays.length}
          noun="upcoming reminders"
        />
      </div>

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
              <th className="px-5 py-2.5">Opened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {notifications.map((n) => (
              <tr key={n.id}>
                <td className="px-5 py-2.5 font-medium">
                  {n.recipients > 1
                    ? `${n.recipients} members`
                    : (n.username ?? "—")}
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
                <td className="px-5 py-2.5">
                  {n.recipients > 1 ? (
                    <span
                      className={
                        n.opened > 0
                          ? "font-medium text-emerald-700"
                          : "text-stone-400"
                      }
                    >
                      {n.opened}/{n.recipients}
                    </span>
                  ) : n.opened > 0 ? (
                    <span className="font-medium text-emerald-700">
                      ✓ opened
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {notifications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-stone-400">
                  Nothing sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          path="/notifications"
          baseQuery={recentBase}
          pageParam="rpage"
          perParam="rper"
          page={rPage}
          perPage={rPer}
          total={recent.total}
          noun="notifications"
        />
      </div>
    </AdminShell>
  );
}

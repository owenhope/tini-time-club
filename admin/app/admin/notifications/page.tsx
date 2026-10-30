import AdminShell from "@/components/AdminShell";
import { PageHeader } from "@/components/AdminPrimitives";
import NotificationComposer from "@/components/NotificationComposer";
import Pagination from "@/components/Pagination";
import { fetchNotificationAudienceCount } from "@/lib/profileData";
import {
  fetchNotificationAnalytics,
  fetchWeeklyPushSubscriberCount,
} from "@/lib/notificationData";
import {
  formatNotificationSentValue,
  humanizeNotificationKind,
} from "@/lib/notificationKinds";
import {
  SEASONAL_REMINDERS,
  reminderForDate,
  upcomingFridays,
} from "@/lib/martiniReminders";
import { parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

// Mirrors REMINDER_HOUR in the app's utils/martiniReminder.ts. Reminders are
// device-local, so this list is the shared message bank, not a server queue.
const REMINDER_HOUR = 16;
const REMINDER_WEEKS = 52;
const SEASONAL_TITLES = new Set(
  SEASONAL_REMINDERS.map((rule) => rule.message.title)
);

const ERRORS: Record<string, string> = {
  body: "Message is required and must be under 180 characters.",
  url: 'Link must be an in-app path starting with "/".',
  audience: "Nobody matched that audience.",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sent?: string;
    error?: string;
    upage?: string;
    uper?: string;
  }>;
}) {
  const params = await searchParams;
  const { sent, error } = params;
  const { page: upcomingPage, perPage: upcomingPer } = parsePagination({
    page: params.upage,
    per: params.uper,
  });
  const allFridays = upcomingFridays(new Date(), REMINDER_WEEKS, REMINDER_HOUR);
  const fridays = allFridays.slice(
    (upcomingPage - 1) * upcomingPer,
    upcomingPage * upcomingPer
  );

  const [members, pushSubscriberCount, analytics] = await Promise.all([
    fetchNotificationAudienceCount(),
    fetchWeeklyPushSubscriberCount(),
    fetchNotificationAnalytics(30),
  ]);
  const openRate =
    analytics.totalSent > 0
      ? `${Math.round((analytics.totalOpened / analytics.totalSent) * 100)}%`
      : "—";

  return (
    <AdminShell active="notifications">
      <PageHeader
        eyebrow="Core workspace"
        title="Notifications"
        description="Send a push note to all audience members or one member."
        stats={[
          {
            label: "Audience members",
            value: members,
            tone: "muted",
          },
          {
            label: "Weekly push subscribers",
            value: pushSubscriberCount,
            tone: "green",
          },
          {
            label: "Notifications 30d",
            value: analytics.totalSent,
            tone: "purple",
          },
          {
            label: "Open rate 30d",
            value: openRate,
            tone: "chartreuse",
          },
        ]}
        surface="transparent"
        density="compact"
        actions={
          <NotificationComposer
            memberCount={members}
            open={Boolean(sent) || Boolean(error)}
          />
        }
      />

      <div className="space-y-6 px-8 py-6">
        {sent ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            Sent to {sent} member{sent === "1" ? "" : "s"}.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {ERRORS[error] ?? "Something went wrong."}
          </p>
        ) : null}

        {analytics.byKind.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <h2 className="border-b border-stone-200 px-5 py-3 font-semibold">
              Push performance{" "}
              <span className="font-normal text-stone-400">(last 30 days)</span>
            </h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-100 text-[11px] uppercase tracking-[0.14em] text-stone-500">
                <tr>
                  <th className="px-5 py-2.5">Kind</th>
                  <th className="px-5 py-2.5">Sent</th>
                  <th className="px-5 py-2.5">Opened</th>
                  <th className="px-5 py-2.5">Open rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {analytics.byKind.map((row) => (
                  <tr key={row.kind}>
                    <td className="px-5 py-2.5">
                      <span className="block font-bold text-stone-900">
                        {humanizeNotificationKind(row.kind)}
                      </span>
                      <span className="block font-mono text-xs text-stone-400">
                        {row.kind}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      {formatNotificationSentValue(row.kind, row.sent)}
                    </td>
                    <td className="px-5 py-2.5">{row.opened}</td>
                    <td className="px-5 py-2.5">
                      {row.openRate == null
                        ? "—"
                        : `${Math.round(row.openRate * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <h2 className="border-b border-stone-200 px-5 py-3 font-semibold">
            Upcoming Tini Time reminders{" "}
            <span className="font-normal text-stone-400">
              (Fridays 4pm, member-local time)
            </span>
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-100 text-[11px] uppercase tracking-[0.14em] text-stone-500">
              <tr>
                <th className="px-5 py-2.5">Friday</th>
                <th className="px-5 py-2.5">Message</th>
                <th className="px-5 py-2.5">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {fridays.map((friday) => {
                const message = reminderForDate(friday);
                const seasonal = SEASONAL_TITLES.has(message.title);
                return (
                  <tr key={friday.toISOString()}>
                    <td className="w-36 whitespace-nowrap px-5 py-2.5 text-stone-500">
                      {friday.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="block font-bold text-stone-900">
                        {message.title}
                      </span>
                      <span className="block text-stone-600">
                        {message.body}
                      </span>
                    </td>
                    <td className="w-28 px-5 py-2.5">
                      {seasonal ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Seasonal
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">Rotating</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination
            path="/admin/notifications"
            pageParam="upage"
            perParam="uper"
            page={upcomingPage}
            perPage={upcomingPer}
            total={allFridays.length}
            noun="upcoming reminders"
          />
        </div>
      </div>
    </AdminShell>
  );
}

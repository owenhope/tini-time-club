import AdminShell from "@/components/AdminShell";
import { PageHeader } from "@/components/AdminPrimitives";
import NotificationComposer from "@/components/NotificationComposer";
import { fetchNotificationAudienceCount } from "@/lib/profileData";
import {
  fetchNotificationAnalytics,
  fetchWeeklyPushSubscriberCount,
} from "@/lib/notificationData";
import {
  formatNotificationSentValue,
  humanizeNotificationKind,
} from "@/lib/notificationKinds";

export const dynamic = "force-dynamic";

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
  }>;
}) {
  const params = await searchParams;
  const { sent, error } = params;

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
      </div>
    </AdminShell>
  );
}

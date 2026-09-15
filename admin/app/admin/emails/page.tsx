import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { PageHeader } from "@/components/AdminPrimitives";
import EmailComposer from "@/components/EmailComposer";
import {
  emailAudience,
  emailAudienceCounts,
  emailCampaign,
  emailCampaigns,
  emailConfiguration,
} from "@/lib/emailService";
import { UUID } from "@/lib/emailModel.mjs";
import type {
  EmailAudienceCounts,
  EmailCampaign,
  EmailCampaignDetail,
} from "@/lib/emailTypes";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-4 py-3 text-sm font-bold ${
        active
          ? "border-emerald-700 text-emerald-900"
          : "border-transparent text-stone-500 hover:text-emerald-900"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const config = emailConfiguration();
  let total = 0;
  let counts: EmailAudienceCounts = { all: 0, active: 0, inactive: 0 };
  let history: EmailCampaign[] = [];
  let detail: EmailCampaignDetail | null = null;
  let loadError = "";
  try {
    const [audience, audienceCounts, campaigns, selected] = await Promise.all([
      emailAudience(),
      emailAudienceCounts(),
      emailCampaigns(),
      params.campaign && UUID.test(params.campaign)
        ? emailCampaign(params.campaign)
        : Promise.resolve(null),
    ]);
    total = audience.total;
    counts = audienceCounts;
    history = campaigns;
    detail = selected;
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Email workspace is unavailable.";
  }
  // An open campaign lives on the recent tab; composing lives on the new tab.
  const activeTab = detail || params.tab === "recent" ? "recent" : "new";
  return (
    <AdminShell active="emails">
      <PageHeader
        eyebrow="Member communication"
        title="Emails"
        description="Write to one member, a selected group, or everyone."
        surface="transparent"
        density="compact"
        stats={[{ label: "Eligible recipients", value: total, tone: "green" }]}
      />
      <div className="space-y-6 px-8 py-6">
        {!config.ready && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Finish email setup before sending.</strong>
            <ul className="mt-2 list-disc pl-5">
              {config.setupIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <p className="mt-2">
              You can save drafts and preview emails while setup is completed.
            </p>
          </div>
        )}
        {loadError ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
          >
            {loadError}
          </p>
        ) : (
          <>
            <nav
              aria-label="Email views"
              className="flex border-b border-stone-200"
            >
              <TabLink href="/admin/emails" active={activeTab === "new"}>
                New email
              </TabLink>
              <TabLink
                href="/admin/emails?tab=recent"
                active={activeTab === "recent"}
              >
                Recent emails{history.length ? ` (${history.length})` : ""}
              </TabLink>
            </nav>
            {activeTab === "new" || detail ? (
              <>
                {detail && (
                  <Link
                    href="/admin/emails?tab=recent"
                    className="inline-block text-sm font-bold text-emerald-900 underline"
                  >
                    ← Back to recent emails
                  </Link>
                )}
                <EmailComposer
                  key={detail?.campaign.id ?? "new"}
                  counts={counts}
                  sender={config.sender}
                  ready={config.ready}
                  initial={detail}
                />
              </>
            ) : (
              <section className="rounded-xl border border-stone-200 bg-white p-6">
                <h2 className="text-lg font-bold">Recent emails</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Open a saved draft or resume an interrupted campaign.
                </p>
                {!history.length && (
                  <p className="mt-5 text-sm text-stone-500">No emails yet.</p>
                )}
                <ul className="mt-4 divide-y divide-stone-100">
                  {history.map((campaign) => (
                    <li key={campaign.id}>
                      <Link
                        className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm hover:text-emerald-800"
                        href={`/admin/emails?tab=recent&campaign=${campaign.id}`}
                      >
                        <span className="font-bold">{campaign.subject}</span>
                        <span className="text-stone-500">
                          {campaign.started_at ? "Started" : "Draft"} ·{" "}
                          {new Date(campaign.created_at).toLocaleDateString(
                            "en-CA",
                            { timeZone: "UTC" }
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

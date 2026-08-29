import { notFound } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import {
  ActionLink,
  PageHeader,
  Panel,
  StatusPill,
} from "@/components/AdminPrimitives";
import {
  approveLocationClaim,
  rejectLocationClaim,
  addLocationManager,
  removeLocationManager,
  revokeLocationVerification,
  restoreLocationVerification,
} from "@/lib/actions";
import { fetchLocationClaimDetail } from "@/lib/claimData";
import { formatLocationClaimStatus } from "@/lib/claimTypes";
import { formatAdminDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await fetchLocationClaimDetail(id);
  if (!detail) notFound();
  const { claim } = detail;
  const approve = approveLocationClaim.bind(null, claim.id);
  const reject = rejectLocationClaim.bind(null, claim.id);
  const addManager = addLocationManager.bind(null, String(claim.location_id));

  return (
    <AdminShell active="claims">
      <PageHeader
        backLink={{ href: "/admin/claims", label: "Back to claims" }}
        eyebrow="Claim review"
        title={detail.location.name ?? "Location claim"}
        description={detail.location.address ?? "No address on file."}
        actions={
          <ActionLink href={`/admin/places/${detail.location.id}`}>
            Open place
          </ActionLink>
        }
      />
      <div className="grid grid-cols-12 gap-5 px-8 py-6">
        <Panel title="Claim" className="col-span-12 xl:col-span-7">
          <div className="space-y-3 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Status</span>
              <StatusPill>{formatLocationClaimStatus(claim.status)}</StatusPill>
            </div>
            <div>
              <span className="text-stone-500">Requester</span>
              <p className="font-bold">
                {claim.contact_name ?? claim.username ?? "Redacted"}
              </p>
              <p className="text-stone-500">
                {claim.account_email ?? "Redacted"}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Business contact</span>
              <p>{claim.business_email ?? "Redacted"}</p>
              <p>{claim.phone ?? "No phone"}</p>
            </div>
            <div>
              <span className="text-stone-500">Role</span>
              <p>{claim.business_role}</p>
            </div>
            <div>
              <span className="text-stone-500">Explanation</span>
              <p className="whitespace-pre-wrap">
                {claim.explanation ?? "Redacted"}
              </p>
            </div>
            <div>
              <span className="text-stone-500">Submitted</span>
              <p>{formatAdminDate(claim.submitted_at)}</p>
            </div>
            {claim.rejection_reason ? (
              <div>
                <span className="text-stone-500">Claimant-visible reason</span>
                <p>{claim.rejection_reason}</p>
              </div>
            ) : null}
            {claim.status === "pending" ? (
              <div className="flex gap-2 pt-2">
                <form action={approve}>
                  <button className="rounded-md bg-emerald-900 px-3 py-2 text-sm font-bold text-white">
                    Approve
                  </button>
                </form>
                <form action={reject} className="flex gap-2">
                  <input
                    name="rejection_reason"
                    required
                    placeholder="Rejection reason"
                    className="rounded-md border border-stone-300 px-3 text-sm"
                  />
                  <input
                    name="admin_notes"
                    placeholder="Private note"
                    className="rounded-md border border-stone-300 px-3 text-sm"
                  />
                  <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-red-700">
                    Reject
                  </button>
                </form>
              </div>
            ) : null}
            {query.error === "reason" ? (
              <p className="text-sm font-bold text-red-700">
                A reason is required.
              </p>
            ) : null}
          </div>
        </Panel>
        <Panel title="Manager access" className="col-span-12 xl:col-span-5">
          <div className="space-y-4 p-4">
            <form action={addManager} className="flex gap-2">
              <input type="hidden" name="claim_id" value={claim.id} />
              <input
                name="profile_query"
                required
                placeholder="Exact email or username"
                className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
              <button className="rounded-md bg-emerald-900 px-3 py-2 text-sm font-bold text-white">
                Add
              </button>
            </form>
            {detail.managers.map((manager) => (
              <div
                key={manager.id}
                className="flex items-center justify-between rounded-md border border-stone-200 p-3 text-sm"
              >
                <div>
                  <p className="font-bold">
                    {manager.profile_name ?? manager.username ?? "Redacted"}
                  </p>
                  <p className="text-stone-500">
                    {manager.status} · added {formatAdminDate(manager.added_at)}
                  </p>
                </div>
                {manager.status === "active" ? (
                  <form action={removeLocationManager.bind(null, manager.id)}>
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <button className="text-sm font-bold text-red-700">
                      Remove
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Verification history" className="col-span-12">
          <div className="divide-y divide-stone-200 p-4">
            {detail.verifications.length ? (
              detail.verifications.map((verification) => (
                <div
                  key={verification.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span>
                    Verified {formatAdminDate(verification.verified_at)}
                    {verification.revoked_at
                      ? ` · revoked ${formatAdminDate(verification.revoked_at)}`
                      : " · active"}
                  </span>
                  <span className="text-stone-500">
                    {verification.revocation_reason ??
                      verification.verification_reason ??
                      "Approved claim"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">No verification history.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-4">
              {detail.verifications.some(
                (verification) => !verification.revoked_at
              ) ? (
                <form
                  action={revokeLocationVerification.bind(
                    null,
                    String(detail.location.id)
                  )}
                  className="flex gap-2"
                >
                  <input
                    name="reason"
                    required
                    placeholder="Private revocation reason"
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-red-700">
                    Revoke
                  </button>
                </form>
              ) : null}
              {detail.verifications.length > 0 &&
              detail.verifications.every(
                (verification) => verification.revoked_at
              ) ? (
                <form
                  action={restoreLocationVerification.bind(
                    null,
                    String(detail.location.id)
                  )}
                  className="flex gap-2"
                >
                  <input
                    name="reason"
                    required
                    placeholder="Restoration reason"
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button className="rounded-md bg-emerald-900 px-3 py-2 text-sm font-bold text-white">
                    Restore
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}

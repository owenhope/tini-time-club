"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  listAllEmailMembers,
  prepareEmailDraft,
  sendEmailChunk,
} from "@/lib/emailActions";
import EmailMemberPicker from "@/components/EmailMemberPicker";
import EmailSidePanel from "@/components/EmailSidePanel";
import type {
  EmailAudienceCounts,
  EmailCampaignDetail,
  EmailMember,
  EmailSegment,
} from "@/lib/emailTypes";

const inputStyle =
  "mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";
const buttonStyle =
  "rounded-lg bg-emerald-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40";

const segmentLabels: Record<EmailSegment, string> = {
  all: "All eligible members",
  active: "Active members (opened the app or reviewed in the last 90 days)",
  inactive: "Inactive members (no app open or review in 90 days)",
};

function isSegment(mode: string): mode is EmailSegment {
  return mode in segmentLabels;
}

export default function EmailComposer({
  counts,
  sender,
  ready,
  initial,
}: {
  counts: EmailAudienceCounts;
  sender: string;
  ready: boolean;
  initial: EmailCampaignDetail | null;
}) {
  const [mode, setMode] = useState("single");
  const router = useRouter();
  const [selected, setSelected] = useState<EmailMember[]>([]);
  const [allMembers, setAllMembers] = useState<EmailMember[] | null>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [showRecipients, setShowRecipients] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [detail, setDetail] = useState(initial);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const sending = useRef(false);
  const stop = useRef(false);
  const draftId = useRef<string | null>(null);
  const includedMembers =
    allMembers?.filter((member) => !excludedIds.includes(member.id)) ?? [];
  const totalRecipients = detail
    ? Object.values(detail.counts).reduce((sum, value) => sum + value, 0)
    : isSegment(mode)
      ? includedMembers.length
      : selected.length;

  const prepare = () =>
    startTransition(async () => {
      setError("");
      draftId.current ??= crypto.randomUUID();
      try {
        const result = await prepareEmailDraft({
          id: draftId.current,
          subject,
          body,
          audience: isSegment(mode) ? mode : "selected",
          ids: selected.map((member) => member.id),
          excludedIds: isSegment(mode) ? excludedIds : [],
        });
        if (result.error) setError(result.error);
        else if (result.detail) {
          setDetail(result.detail);
          router.replace(`/admin/emails?campaign=${result.detail.campaign.id}`);
        }
      } catch {
        setError(
          "Unable to save the draft. Your message is still here; try again."
        );
      }
    });

  const send = () => {
    if (!detail || sending.current) return;
    sending.current = true;
    stop.current = false;
    startTransition(async () => {
      setError("");
      setNotice("");
      try {
        while (!stop.current) {
          const result = await sendEmailChunk(detail.campaign.id);
          if ("error" in result) {
            if (result.detail) setDetail(result.detail);
            setError(result.error);
            break;
          }
          setDetail(result.detail);
          if (
            result.detail.counts.pending + result.detail.counts.sending ===
            0
          ) {
            setNotice(
              "Processing finished. Accepted emails are listed below; delivery and bounce details are available in Resend."
            );
            break;
          }
          if (!result.processed) {
            setNotice(
              "Some recipients are still processing or waiting for a retry. Wait five minutes, then resume this campaign."
            );
            break;
          }
        }
        if (stop.current)
          setNotice("Paused. You can resume this campaign from email history.");
      } catch {
        setError(
          "Connection interrupted. Reopen this campaign from history and resume after five minutes."
        );
      } finally {
        sending.current = false;
      }
    });
  };

  const loadMembers = (segment: EmailSegment) =>
    startTransition(async () => {
      setError("");
      setAllMembers(null);
      try {
        setAllMembers(await listAllEmailMembers(segment));
      } catch {
        setError(
          "Unable to load eligible members. Retry using the button in the recipient list."
        );
      }
    });

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {!detail ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-full items-stretch gap-4">
            {isSegment(mode) && (
              <EmailSidePanel
                id="email-recipient-panel"
                title={`Recipients${allMembers ? ` (${includedMembers.length})` : ""}`}
                expanded={showRecipients}
                onToggle={() => setShowRecipients(!showRecipients)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mt-1 text-sm text-stone-500">
                      Remove anyone who should not receive this email.
                    </p>
                  </div>
                  {excludedIds.length > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      className="shrink-0 text-sm font-bold text-emerald-900 underline disabled:opacity-40"
                      onClick={() => {
                        setExcludedIds([]);
                        draftId.current = null;
                      }}
                    >
                      Restore all
                    </button>
                  )}
                </div>
                {allMembers === null ? (
                  <div className="mt-4 text-sm text-stone-500" role="status">
                    {busy ? (
                      "Loading members…"
                    ) : (
                      <button
                        type="button"
                        className="font-bold text-emerald-900 underline"
                        onClick={() => {
                          if (isSegment(mode)) loadMembers(mode);
                        }}
                      >
                        Retry loading members
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <ul
                      className="mt-4 max-h-[32rem] divide-y divide-stone-100 overflow-y-auto"
                      aria-label="Email recipients"
                    >
                      {includedMembers.map((member) => (
                        <li
                          key={member.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold">
                              {member.username ?? member.name ?? "Member"}
                            </p>
                            <p className="break-all text-sm text-stone-500">
                              {member.email}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Exclude ${member.username ?? member.email}`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                            onClick={() => {
                              setExcludedIds([...excludedIds, member.id]);
                              draftId.current = null;
                            }}
                          >
                            <span aria-hidden="true">×</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {!includedMembers.length && (
                      <p className="mt-4 text-sm text-stone-500">
                        No recipients selected.
                      </p>
                    )}
                    {excludedIds.length > 0 && (
                      <p role="status" className="mt-3 text-xs text-stone-500">
                        {excludedIds.length} excluded from this email.
                      </p>
                    )}
                  </>
                )}
              </EmailSidePanel>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                prepare();
              }}
              className="min-w-[22rem] flex-[1.2] space-y-6 rounded-xl border border-stone-200 bg-white p-6"
            >
              <fieldset disabled={busy} className="space-y-5">
                <legend className="text-lg font-bold">Compose an email</legend>
                <p className="text-sm text-stone-500">
                  From: {sender || "Sender not configured"}
                </p>
                <label className="block text-sm font-bold">
                  Recipients
                  <select
                    className={inputStyle}
                    value={mode}
                    onChange={(event) => {
                      const next = event.target.value;
                      setMode(next);
                      setSelected([]);
                      setExcludedIds([]);
                      draftId.current = null;
                      if (isSegment(next)) loadMembers(next);
                    }}
                  >
                    <option value="single">One member</option>
                    <option value="selected">Selected members</option>
                    {(Object.keys(segmentLabels) as EmailSegment[]).map(
                      (segment) => (
                        <option key={segment} value={segment}>
                          {segmentLabels[segment]} ({counts[segment]})
                        </option>
                      )
                    )}
                  </select>
                </label>
                {!isSegment(mode) && (
                  <EmailMemberPicker
                    key={mode}
                    selected={selected}
                    multiple={mode === "selected"}
                    onChange={(members) => {
                      setSelected(members);
                      draftId.current = null;
                    }}
                  />
                )}
                <label className="block text-sm font-bold">
                  Subject
                  <input
                    className={inputStyle}
                    required
                    maxLength={200}
                    value={subject}
                    onChange={(event) => {
                      setSubject(event.target.value);
                      draftId.current = null;
                    }}
                  />
                </label>
                <label className="block text-sm font-bold">
                  Message
                  <textarea
                    className={`${inputStyle} min-h-64`}
                    required
                    maxLength={20000}
                    value={body}
                    onChange={(event) => {
                      setBody(event.target.value);
                      draftId.current = null;
                    }}
                    placeholder="What would you like to share with members?"
                  />
                </label>
                <p className="text-xs text-stone-500">
                  Active accounts with confirmed emails only. Unsubscribed
                  members are excluded. Each person receives a separate email.
                </p>
                <button
                  className={buttonStyle}
                  disabled={busy || !totalRecipients}
                >
                  {busy
                    ? "Saving…"
                    : `Review email · ${totalRecipients} recipient${totalRecipients === 1 ? "" : "s"}`}
                </button>
              </fieldset>
            </form>
            <EmailSidePanel
              id="email-preview-panel"
              title="Email preview"
              expanded={showPreview}
              onToggle={() => setShowPreview(!showPreview)}
            >
              {/* The sent email always renders light, so the preview pins the
                  template's literal colors instead of theme classes (which the
                  dark theme remaps, hiding ink text on a darkened card). */}
              <div className="overflow-hidden rounded-2xl border border-[#e7e5e4] bg-[#ffffff]">
                <div className="bg-[#10241B] px-6 py-4">
                  <p className="text-lg font-bold text-[#FAF9F6]">
                    tini time club.
                  </p>
                </div>
                <div className="px-6 py-6">
                  <h3 className="mb-4 break-words text-xl font-bold text-[#10241B]">
                    {subject || "Your subject"}
                  </h3>
                  <div className="whitespace-pre-wrap break-words text-sm leading-7 text-[#1c1917]">
                    {body || "Your message will appear here."}
                  </div>
                  <span className="mt-7 inline-block rounded-full bg-[#F2FF71] px-6 py-3 text-sm font-bold text-[#10241B]">
                    Download on the App Store
                  </span>
                </div>
                <p className="border-t border-[#e7e5e4] px-6 py-4 text-xs text-[#78716c]">
                  Tini Time Club ·{" "}
                  <span className="underline">Get the app</span> ·{" "}
                  <span className="underline">
                    Unsubscribe from member emails
                  </span>
                </p>
              </div>
            </EmailSidePanel>
          </div>
        </div>
      ) : (
        <div className="space-y-6 rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-stone-500">
                {detail.campaign.started_at
                  ? "Email campaign"
                  : "Review before sending"}
              </p>
              <h2 className="mt-1 break-words text-2xl font-bold">
                {detail.campaign.subject}
              </h2>
              <p className="mt-2 text-sm">
                From {detail.campaign.sender} · {totalRecipients} recipients
              </p>
            </div>
            <Link
              href="/admin/emails"
              className="text-sm font-bold text-emerald-900 underline"
            >
              New email
            </Link>
          </div>
          <div className="whitespace-pre-wrap break-words rounded-lg bg-stone-50 p-5 text-sm leading-7">
            {detail.campaign.body}
          </div>
          <div className="flex flex-wrap gap-4 text-sm" role="status">
            {Object.entries(detail.counts).map(([status, count]) => (
              <span key={status}>
                <strong>{count}</strong>{" "}
                {status === "sent"
                  ? "accepted by Resend"
                  : status === "sending"
                    ? "processing / awaiting retry"
                    : status}
              </span>
            ))}
          </div>
          {detail.counts.uncertain > 0 && (
            <p className="text-sm text-amber-800">
              Some attempts are over 23 hours old. Check them in Resend before
              sending another email; automatic retries are disabled to prevent
              duplicates.
            </p>
          )}
          {detail.counts.pending + detail.counts.sending > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <button
                className={buttonStyle}
                disabled={busy || !ready}
                onClick={send}
              >
                {busy
                  ? "Sending…"
                  : detail.campaign.started_at
                    ? "Resume sending"
                    : `Send to ${totalRecipients} recipient${totalRecipients === 1 ? "" : "s"}`}
              </button>
              {busy && (
                <button
                  className="text-sm font-bold underline"
                  onClick={() => {
                    stop.current = true;
                  }}
                >
                  Pause after this batch
                </button>
              )}
              <p className="text-xs text-stone-500">
                Keep this page open while sending. Saved campaigns can be
                resumed from history.
              </p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-3 text-left font-bold">
                Recipients {totalRecipients > 50 ? "(first 50)" : ""}
              </caption>
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="py-2">Email</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {detail.recipients.map((recipient) => (
                  <tr key={recipient.id} className="border-b border-stone-100">
                    <td className="break-all py-3 pr-4">{recipient.email}</td>
                    <td className="pr-4">
                      {recipient.status === "sent"
                        ? "Accepted"
                        : recipient.status}
                    </td>
                    <td className="font-mono text-xs">
                      {recipient.provider_id ?? recipient.error_code ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

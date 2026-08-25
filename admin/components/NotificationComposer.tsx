"use client";

import { useEffect, useState } from "react";
import { sendNotification } from "@/lib/actions";
import type { NotificationAudienceMember } from "@/lib/profileTypes";

interface NotificationComposerProps {
  memberCount: number;
  open: boolean;
}

export default function NotificationComposer({
  memberCount,
  open,
}: NotificationComposerProps) {
  const [audience, setAudience] = useState("all");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<NotificationAudienceMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (audience === "all" || trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/admin/api/notification-audience?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Unable to search members");
        const result = (await response.json()) as {
          members?: NotificationAudienceMember[];
        };
        setMembers(result.members ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMembers([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [audience, query]);

  const selected =
    audience === "all"
      ? null
      : (members.find((member) => member.id === audience) ?? null);

  return (
    <details className="relative" open={open}>
      <summary className="cursor-pointer list-none rounded-md bg-emerald-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 [&::-webkit-details-marker]:hidden">
        + Send notification
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-[26rem] max-w-[90vw] rounded-lg border border-stone-200 bg-white p-5 shadow-xl">
        <form action={sendNotification}>
          <label className="block text-sm font-medium text-stone-700">
            Audience
            <input type="hidden" name="audience" value={audience} />
            <div className="mt-1 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setAudience("all");
                  setQuery("");
                }}
                className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                  audience === "all"
                    ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                    : "border-stone-300 bg-white text-stone-700"
                }`}
              >
                All members ({memberCount})
              </button>
              <input
                type="search"
                value={
                  selected ? (selected.username ?? selected.name ?? "") : query
                }
                onChange={(event) => {
                  setAudience(event.target.value ? audience : "all");
                  setQuery(event.target.value);
                  if (selected) setAudience("search");
                }}
                onFocus={() => {
                  if (audience === "all") setAudience("search");
                }}
                placeholder="Search username or name"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                aria-label="Search notification recipient"
              />
              {audience !== "all" && !selected && query.trim().length >= 2 ? (
                <div className="max-h-40 overflow-y-auto rounded-md border border-stone-200 bg-white">
                  {loading ? (
                    <p className="px-3 py-2 text-sm text-stone-500">
                      Searching…
                    </p>
                  ) : members.length > 0 ? (
                    members.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setAudience(member.id)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
                      >
                        <span className="block font-medium text-stone-900">
                          {member.username ?? member.name ?? member.id}
                        </span>
                        {member.username && member.name ? (
                          <span className="block text-xs text-stone-500">
                            {member.name}
                          </span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-stone-500">
                      No active members found.
                    </p>
                  )}
                </div>
              ) : null}
              {selected ? (
                <button
                  type="button"
                  onClick={() => {
                    setAudience("search");
                    setQuery("");
                  }}
                  className="text-xs font-medium text-stone-500 underline"
                >
                  Clear recipient
                </button>
              ) : null}
            </div>
          </label>
          <label className="mt-3 block text-sm font-medium text-stone-700">
            Link (optional, in-app path)
            <input
              type="text"
              name="url"
              placeholder="/places/8"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-stone-700">
            Message
            <textarea
              name="body"
              required
              maxLength={180}
              rows={3}
              placeholder="Happy hour intel, feature news, a nudge..."
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="mt-4 w-full rounded-md bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Send
          </button>
        </form>
      </div>
    </details>
  );
}
